import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "electron";
import { validateLocation } from "./locationValidation";
import type { NativeLocation } from "./locationValidation";

export type { NativeLocation } from "./locationValidation";

export type NativeLocationErrorCode =
  | "permission-denied"
  | "disabled"
  | "unavailable"
  | "timeout"
  | "invalid-coordinates"
  | "helper-not-found"
  | "helper-failed";

export type NativeLocationResult =
  | { ok: true; location: NativeLocation }
  | { ok: false; code: NativeLocationErrorCode; message: string };

export class NativeLocationError extends Error {
  public readonly code: NativeLocationErrorCode;

  constructor(
    code: NativeLocationErrorCode,
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = "NativeLocationError";
  }
}

const LOCATION_TIMEOUT_MS = 15_000;
const HELPER_NAME = "get-current-location.ps1";
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

function helperPath(): string {
  const candidates = [
    path.join(process.resourcesPath, "windows", HELPER_NAME),
    path.join(app.getAppPath(), "electron", "windows", HELPER_NAME),
    path.join(moduleDirectory, "..", "windows", HELPER_NAME),
  ];

  const candidate = candidates.find((value) => fs.existsSync(value));
  if (!candidate) {
    throw new NativeLocationError(
      "helper-not-found",
      "The Windows location helper is not installed with this application.",
    );
  }

  return candidate;
}

function classifyHelperFailure(output: string): NativeLocationError {
  const normalized = output.toLowerCase();
  if (normalized.includes("permission_denied")) {
    return new NativeLocationError(
      "permission-denied",
      "Windows denied location permission. Enable Location Services for this app and try again.",
    );
  }
  if (normalized.includes("disabled")) {
    return new NativeLocationError(
      "disabled",
      "Windows Location Services are disabled. Enable them in Windows Settings and try again.",
    );
  }
  if (normalized.includes("unavailable")) {
    return new NativeLocationError(
      "unavailable",
      "Windows could not find an available location provider.",
    );
  }

  return new NativeLocationError(
    "helper-failed",
    output.trim() || "The Windows location helper failed.",
  );
}

export function getCurrentWindowsLocation(): Promise<NativeLocation> {
  if (process.platform !== "win32") {
    return Promise.reject(
      new NativeLocationError(
        "unavailable",
        "Windows Location Services are only available on Windows.",
      ),
    );
  }

  let script: string;
  try {
    script = helperPath();
  } catch (error) {
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        script,
      ],
      { windowsHide: true },
    );
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };

    const timeout = setTimeout(() => {
      child.kill();
      finish(() =>
        reject(
          new NativeLocationError(
            "timeout",
            "Windows location lookup timed out.",
          ),
        ),
      );
    }, LOCATION_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      finish(() => reject(classifyHelperFailure(error.message)));
    });
    child.on("close", (code) => {
      finish(() => {
        if (code !== 0) {
          reject(classifyHelperFailure(`${stdout}\n${stderr}`));
          return;
        }

        try {
          resolve(validateLocation(JSON.parse(stdout)));
        } catch (error) {
          reject(
            new NativeLocationError(
              "invalid-coordinates",
              error instanceof Error
                ? error.message
                : "The Windows location helper returned malformed data.",
            ),
          );
        }
      });
    });
  });
}