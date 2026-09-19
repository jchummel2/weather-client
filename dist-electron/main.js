import { ipcMain, app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
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
function registerIpcHandlers() {
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
        forecast
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, step: "createSession", message: msg };
    }
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
  try {
    const ses = win.webContents.session;
    ses.setPermissionRequestHandler((_webContents, permission, callback) => {
      if (permission === "geolocation") {
        callback(true);
      } else {
        callback(false);
      }
    });
  } catch (e) {
    console.warn("Failed to set permission handler", e);
  }
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
