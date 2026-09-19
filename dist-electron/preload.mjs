"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("appApi", {
  bootstrap: (latitude, longitude) => electron.ipcRenderer.invoke("app:bootstrap", { latitude, longitude }),
  getApproxLocation: async () => {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(p),
        (err) => reject(err),
        { timeout: 5e3 }
      );
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      city: null,
      region: null,
      country: null
    };
  },
  createSession: () => electron.ipcRenderer.invoke("create-session"),
  saveLocation: (lat, lon) => electron.ipcRenderer.invoke("save-location", { lat, lon }),
  getCurrent: () => electron.ipcRenderer.invoke("get-current"),
  getForecast: () => electron.ipcRenderer.invoke("get-forecast")
});
