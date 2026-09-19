import { contextBridge, ipcRenderer } from "electron";
import type { NativeLocationResult } from "./main/nativeLocation";

contextBridge.exposeInMainWorld("appApi", {
  bootstrap: (latitude: number, longitude: number) =>
    ipcRenderer.invoke("app:bootstrap", { latitude, longitude }),
  createSession: () => ipcRenderer.invoke("create-session"),
  saveLocation: (lat: number, lon: number) =>
    ipcRenderer.invoke("save-location", { lat, lon }),
  getCurrent: () => ipcRenderer.invoke("get-current"),
  getForecast: () => ipcRenderer.invoke("get-forecast"),
});

contextBridge.exposeInMainWorld("locationApi", {
  getCurrentLocation: (): Promise<NativeLocationResult> =>
    ipcRenderer.invoke("location:get-current"),
});