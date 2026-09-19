import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("appApi", {
  bootstrap: (latitude: number, longitude: number) =>
    ipcRenderer.invoke("app:bootstrap", { latitude, longitude }),
  getApproxLocation: async () => {
    // Prefer the renderer geolocation API (prompts user, avoids external IP lookup)
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(p),
        (err) => reject(err),
        { timeout: 5000 }
      );
    });

    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      city: null,
      region: null,
      country: null,
    };
  },
  createSession: () => ipcRenderer.invoke("create-session"),
  saveLocation: (lat: number, lon: number) =>
    ipcRenderer.invoke("save-location", { lat, lon }),
  getCurrent: () => ipcRenderer.invoke("get-current"),
  getForecast: () => ipcRenderer.invoke("get-forecast"),
});