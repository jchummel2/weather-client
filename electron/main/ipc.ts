import { ipcMain } from "electron";
import {
  createSession,
  ensureSession,
  saveLocation,
  getCurrent,
  getForecast,
} from "./backendApi";
import { getCurrentWindowsLocation } from "./nativeLocation";
import { requestLocation } from "./locationIpc";
import { runBootstrap } from "./bootstrapFlow";

// Register IPC handlers from one place so main process can call this on startup.
export function registerIpcHandlers() {
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
      longitude,
    );
    return result.ok
      ? { ...result, success: true }
      : result;
  });
}