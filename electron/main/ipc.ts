import { ipcMain } from "electron";
import {
  createSession,
  ensureSession,
  saveLocation,
  getCurrent,
  getForecast,
} from "./backendApi";

// Register IPC handlers from one place so main process can call this on startup.
export function registerIpcHandlers() {
  // Note: IP-based location lookup removed to avoid external IP service 403s.
  // Prefer renderer `navigator.geolocation` and explicit user permission.

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
    try {
      const token = await createSession();
      await saveLocation(token, latitude, longitude);
      const current = await getCurrent(token);
      const forecast = await getForecast(token);

      return {
        ok: true,
        success: true,
        sessionToken: token,
        current,
        forecast,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Best-effort: return a shaped error the renderer can understand.
      return { ok: false, step: "createSession", message: msg } as any;
    }
  });
}