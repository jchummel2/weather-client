"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("appApi", {
  bootstrap: (latitude, longitude) => electron.ipcRenderer.invoke("app:bootstrap", { latitude, longitude }),
  createSession: () => electron.ipcRenderer.invoke("create-session"),
  saveLocation: (lat, lon) => electron.ipcRenderer.invoke("save-location", { lat, lon }),
  getCurrent: () => electron.ipcRenderer.invoke("get-current"),
  getForecast: () => electron.ipcRenderer.invoke("get-forecast")
});
electron.contextBridge.exposeInMainWorld("locationApi", {
  getCurrentLocation: () => electron.ipcRenderer.invoke("location:get-current")
});
