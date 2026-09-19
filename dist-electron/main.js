var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, ipcMain, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { spawn } from "node:child_process";
const BASE_URL = "http://localhost:8080";
let sessionToken = null;
function sessionHeader(token) {
  return { "X-Session-Token": token, Authorization: `Bearer ${token}` };
}
async function fetchWithLogging(url, options, label) {
  try {
    console.debug(`HTTP ${label} -> ${url}`);
    if (options) {
      const { headers, body } = options;
      console.debug(`Request ${label} headers:`, headers);
      if (body) {
        try {
          console.debug(`Request ${label} body:`, typeof body === "string" ? body : JSON.stringify(body));
        } catch (e) {
          console.debug(`Request ${label} body (unserializable)`);
        }
      }
    }
    const resp = await fetch(url, options);
    try {
      const clone = resp.clone();
      const text = await clone.text();
      console.debug(`Response ${label} status=${resp.status} body:`, text);
    } catch (e) {
      console.debug(`Response ${label} status=${resp.status} (failed to read body)`);
    }
    return resp;
  } catch (e) {
    console.error(`HTTP ${label} -> ${url} error:`, e);
    throw e;
  }
}
async function jsonOrThrow(resp, label) {
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`${label} failed: ${resp.status} ${text}`);
  }
  return resp.json();
}
async function createSession() {
  let resp = await fetchWithLogging(`${BASE_URL}/v4/session`, { method: "GET" }, "createSession-GET");
  if (!resp.ok) {
    resp = await fetchWithLogging(`${BASE_URL}/v4/session`, { method: "POST" }, "createSession-POST");
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`createSession failed: ${resp.status} ${text}`);
  }
  const tokenFromHeader = resp.headers && resp.headers.get && resp.headers.get("x-session-token") || null;
  const anyJson = await resp.json().catch(() => null);
  const tokenFromBody = (anyJson == null ? void 0 : anyJson.token) ?? (anyJson == null ? void 0 : anyJson.sessionToken) ?? (anyJson == null ? void 0 : anyJson.tokenValue) ?? null;
  const token = tokenFromHeader ?? tokenFromBody;
  if (!token) {
    throw new Error(
      `createSession: server did not return a session token (body: ${JSON.stringify(anyJson)}, header x-session-token: ${tokenFromHeader})`
    );
  }
  sessionToken = String(token);
  console.debug("createSession: obtained token from server", { tokenSource: tokenFromHeader ? "header" : "body", token: sessionToken });
  return sessionToken;
}
async function ensureSession() {
  if (sessionToken) return sessionToken;
  return createSession();
}
async function saveLocation(token, latitude, longitude) {
  console.debug("saveLocation: sending location", { token, latitude, longitude });
  async function doPost(tkn) {
    return fetchWithLogging(`${BASE_URL}/v4/session/location`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...sessionHeader(tkn)
      },
      body: JSON.stringify({ latitude, longitude })
    }, "saveLocation-POST");
  }
  let resp = await doPost(token);
  if (resp.status === 401) {
    console.warn("saveLocation: got 401, refreshing session and retrying");
    sessionToken = null;
    const newToken = await createSession();
    resp = await doPost(newToken);
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error(`saveLocation failed: ${resp.status} ${text}`);
    throw new Error(`saveLocation failed ${resp.status} ${text}`);
  }
}
async function getCurrent(token) {
  console.debug("getCurrent: using token", { token });
  async function doGet(tkn) {
    return fetchWithLogging(`${BASE_URL}/v4/weather/current`, { headers: sessionHeader(tkn) }, "getCurrent-GET");
  }
  let resp = await doGet(token);
  if (resp.status === 401) {
    console.warn("getCurrent: got 401, refreshing session and retrying");
    sessionToken = null;
    const newToken = await createSession();
    resp = await doGet(newToken);
  }
  return jsonOrThrow(resp, "current");
}
async function getForecast(token) {
  console.debug("getForecast: using token", { token });
  async function doGet(tkn) {
    return fetchWithLogging(`${BASE_URL}/v4/weather/forecast`, { headers: sessionHeader(tkn) }, "getForecast-GET");
  }
  let resp = await doGet(token);
  if (resp.status === 401) {
    console.warn("getForecast: got 401, refreshing session and retrying");
    sessionToken = null;
    const newToken = await createSession();
    resp = await doGet(newToken);
  }
  return jsonOrThrow(resp, "forecast");
}
function validateLocation(value) {
  const location = value;
  if (!location || typeof location.latitude !== "number" || typeof location.longitude !== "number" || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || location.latitude < -90 || location.latitude > 90 || location.longitude < -180 || location.longitude > 180) {
    throw new Error("Windows returned invalid latitude or longitude values.");
  }
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    city: typeof location.city === "string" && location.city.trim() ? location.city.trim() : null
  };
}
class NativeLocationError extends Error {
  constructor(code, message) {
    super(message);
    __publicField(this, "code");
    this.code = code;
    this.name = "NativeLocationError";
  }
}
const LOCATION_TIMEOUT_MS = 15e3;
const HELPER_NAME = "get-current-location.ps1";
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
function helperPath() {
  const candidates = [
    path.join(process.resourcesPath, "windows", HELPER_NAME),
    path.join(app.getAppPath(), "electron", "windows", HELPER_NAME),
    path.join(moduleDirectory, "..", "windows", HELPER_NAME)
  ];
  const candidate = candidates.find((value) => fs.existsSync(value));
  if (!candidate) {
    throw new NativeLocationError(
      "helper-not-found",
      "The Windows location helper is not installed with this application."
    );
  }
  return candidate;
}
function classifyHelperFailure(output) {
  const normalized = output.toLowerCase();
  if (normalized.includes("permission_denied")) {
    return new NativeLocationError(
      "permission-denied",
      "Windows denied location permission. Enable Location Services for this app and try again."
    );
  }
  if (normalized.includes("disabled")) {
    return new NativeLocationError(
      "disabled",
      "Windows Location Services are disabled. Enable them in Windows Settings and try again."
    );
  }
  if (normalized.includes("unavailable")) {
    return new NativeLocationError(
      "unavailable",
      "Windows could not find an available location provider."
    );
  }
  return new NativeLocationError(
    "helper-failed",
    output.trim() || "The Windows location helper failed."
  );
}
function getCurrentWindowsLocation() {
  if (process.platform !== "win32") {
    return Promise.reject(
      new NativeLocationError(
        "unavailable",
        "Windows Location Services are only available on Windows."
      )
    );
  }
  let script;
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
        script
      ],
      { windowsHide: true }
    );
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const timeout = setTimeout(() => {
      child.kill();
      finish(
        () => reject(
          new NativeLocationError(
            "timeout",
            "Windows location lookup timed out."
          )
        )
      );
    }, LOCATION_TIMEOUT_MS);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      finish(() => reject(classifyHelperFailure(error.message)));
    });
    child.on("close", (code) => {
      finish(() => {
        if (code !== 0) {
          reject(classifyHelperFailure(`${stdout}
${stderr}`));
          return;
        }
        try {
          resolve(validateLocation(JSON.parse(stdout)));
        } catch (error) {
          reject(
            new NativeLocationError(
              "invalid-coordinates",
              error instanceof Error ? error.message : "The Windows location helper returned malformed data."
            )
          );
        }
      });
    });
  });
}
async function requestLocation(getLocation) {
  try {
    return { ok: true, location: await getLocation() };
  } catch (error) {
    const details = error;
    return {
      ok: false,
      code: details.code ?? "helper-failed",
      message: details.message ?? "Windows location lookup failed."
    };
  }
}
async function runBootstrap(dependencies, latitude, longitude) {
  let token;
  try {
    token = await dependencies.createSession();
  } catch (error) {
    return { ok: false, step: "createSession", message: errorMessage(error) };
  }
  try {
    await dependencies.saveLocation(token, latitude, longitude);
  } catch (error) {
    return { ok: false, step: "saveLocation", message: errorMessage(error) };
  }
  let current;
  try {
    current = await dependencies.getCurrent(token);
  } catch (error) {
    return { ok: false, step: "current", message: errorMessage(error) };
  }
  try {
    const forecast = await dependencies.getForecast(token);
    return { ok: true, sessionToken: token, current, forecast };
  } catch (error) {
    return { ok: false, step: "forecast", message: errorMessage(error) };
  }
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function registerIpcHandlers() {
  ipcMain.handle("location:get-current", async () => {
    return requestLocation(getCurrentWindowsLocation);
  });
  ipcMain.handle("create-session", async () => {
    return createSession();
  });
  ipcMain.handle("save-location", async (_e, { lat, lon }) => {
    const token = await ensureSession();
    await saveLocation(token, lat, lon);
    return true;
  });
  ipcMain.handle("get-current", async () => {
    const token = await ensureSession();
    return getCurrent(token);
  });
  ipcMain.handle("get-forecast", async () => {
    const token = await ensureSession();
    return getForecast(token);
  });
  ipcMain.handle("app:bootstrap", async (_e, { latitude, longitude }) => {
    const result = await runBootstrap(
      { createSession, saveLocation, getCurrent, getForecast },
      latitude,
      longitude
    );
    return result.ok ? { ...result, success: true } : result;
  });
}
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
function resolvePreloadPath() {
  const candidates = [
    path.join(__dirname$1, "preload.js"),
    path.join(__dirname$1, "preload.mjs"),
    path.join(__dirname$1, "preload", "index.js"),
    path.join(__dirname$1, "preload", "index.mjs")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log("✅ Using preload:", candidate);
      return candidate;
    }
  }
  console.error("❌ Preload not found. dist-electron contents:");
  console.error(fs.readdirSync(__dirname$1));
  throw new Error("Preload file not found.");
}
function createWindow() {
  const preloadPath = resolvePreloadPath();
  const win = new BrowserWindow({
    width: 1e3,
    height: 700,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
  return win;
}
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});
