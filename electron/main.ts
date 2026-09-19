import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { registerIpcHandlers } from "./main/ipc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// mainWindow not used elsewhere — createWindow() is called on startup.

function resolvePreloadPath(): string {
  // Your compiled output is in dist-electron (your logs show dist-electron/main.js)
  // Preload in your build is likely dist-electron/preload.js (same folder as main.js)
  const candidates = [
    path.join(__dirname, "preload.js"),
    path.join(__dirname, "preload.mjs"),
    path.join(__dirname, "preload", "index.js"),
    path.join(__dirname, "preload", "index.mjs"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log("✅ Using preload:", candidate);
      return candidate;
    }
  }

  console.error("❌ Preload not found. dist-electron contents:");
  console.error(fs.readdirSync(__dirname));
  throw new Error("Preload file not found.");
}

function resolveAppIconPath(): string | undefined {
  const candidates = [
    path.join(__dirname, "../dist/weatherly-icon.png"),
    path.join(app.getAppPath(), "public/weatherly-icon.png"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function createWindow(): BrowserWindow {
  const preloadPath = resolvePreloadPath();
  const iconPath = resolveAppIconPath();

  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  return win;
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});