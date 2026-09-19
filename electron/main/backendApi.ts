import type {
  ForecastDto,
  ForecastListDto,
} from "./backendApi.types";

const BASE_URL = "http://localhost:8080";

let sessionToken: string | null = null;

function sessionHeader(token: string) {
  // Include both X-Session-Token and Authorization Bearer to support
  // different backend expectations (some servers expect Authorization header).
  return { "X-Session-Token": token, Authorization: `Bearer ${token}` };
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

async function fetchWithLogging(url: string, options: RequestInit | undefined, label: string) {
  try {
    console.debug(`HTTP ${label} -> ${url}`);
    if (options) {
      const { headers, body } = options;
      console.debug(`Request ${label} headers:`, headers);
      if (body) {
        // body may be a stringified JSON
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

async function jsonOrThrow<T>(resp: Response, label: string): Promise<T> {
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`${label} failed: ${resp.status} ${text}`);
  }
  return resp.json() as Promise<T>;
}

export async function createSession(): Promise<string> {
  // Some backends return a session token via a GET (header) before the client
  // posts location. Try GET first and fall back to POST.
  let resp = await fetchWithLogging(`${BASE_URL}/v4/session`, { method: "GET" }, "createSession-GET");

  if (!resp.ok) {
    // If GET isn't allowed, try POST as a fallback
    resp = await fetchWithLogging(`${BASE_URL}/v4/session`, { method: "POST" }, "createSession-POST");
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`createSession failed: ${resp.status} ${text}`);
  }

  // Try to obtain token from header first (common when backend uses header)
  const tokenFromHeader = (resp.headers && resp.headers.get && resp.headers.get("x-session-token")) || null;

  // Also attempt to parse body for known token fields
  const responseBody: unknown = await resp.json().catch(() => null);
  const tokenFromBody = isRecord(responseBody)
    ? responseBody.token ?? responseBody.sessionToken ?? responseBody.tokenValue ?? null
    : null;

  const token = tokenFromHeader ?? tokenFromBody;

  if (!token) {
    throw new Error(
      `createSession: server did not return a session token (body: ${JSON.stringify(responseBody)}, header x-session-token: ${tokenFromHeader})`
    );
  }

  sessionToken = String(token);
  console.debug("createSession: obtained token from server", { tokenSource: tokenFromHeader ? "header" : "body", token: sessionToken });
  return sessionToken;
}

export async function ensureSession(): Promise<string> {
  if (sessionToken) return sessionToken;
  return createSession();
}

export async function saveLocation(
  token: string,
  latitude: number,
  longitude: number
): Promise<void> {
  console.debug("saveLocation: sending location", { token, latitude, longitude });

  async function doPost(tkn: string) {
    return fetchWithLogging(`${BASE_URL}/v4/session/location`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...sessionHeader(tkn),
      },
      body: JSON.stringify({ latitude, longitude }),
    }, "saveLocation-POST");
  }

  let resp = await doPost(token);

  // If unauthorized, refresh token once and retry
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

export async function getCurrent(token: string): Promise<ForecastDto> {
  console.debug("getCurrent: using token", { token });
  async function doGet(tkn: string) {
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

export async function getForecast(token: string): Promise<ForecastListDto> {
  console.debug("getForecast: using token", { token });
  async function doGet(tkn: string) {
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

export { errorMessage };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}