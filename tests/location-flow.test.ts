import assert from "node:assert/strict";
import test from "node:test";
import { runBootstrap } from "../electron/main/bootstrapFlow.ts";
import { requestLocation } from "../electron/main/locationIpc.ts";
import { validateLocation } from "../electron/main/locationValidation.ts";

const current = { periodName: "Today", shortForecast: "Clear", temperature: 70, temperatureUnit: "F", windSpeed: "5 mph", windDirection: "N", fetchedAt: "now" };
const forecast = { fetchedAt: "now", periods: [current] };

function dependencies(overrides: Partial<Parameters<typeof runBootstrap>[0]> = {}) {
  return {
    createSession: async () => "session-token",
    saveLocation: async () => undefined,
    getCurrent: async () => current,
    getForecast: async () => forecast,
    ...overrides,
  };
}

test("IPC returns native coordinates on success", async () => {
  const result = await requestLocation(async () => ({ latitude: 42.4975, longitude: -94.168 }));
  assert.deepEqual(result, { ok: true, location: { latitude: 42.4975, longitude: -94.168 } });
});

test("IPC maps permission denial", async () => {
  const result = await requestLocation(async () => {
    throw Object.assign(new Error("Location access denied"), { code: "permission-denied" });
  });
  assert.deepEqual(result, { ok: false, code: "permission-denied", message: "Location access denied" });
});

test("invalid coordinates are rejected", () => {
  assert.throws(() => validateLocation({ latitude: 91, longitude: -94 }), /invalid latitude/i);
  assert.throws(() => validateLocation({ latitude: "42", longitude: -94 }), /invalid latitude/i);
});

test("bootstrap reports failed session creation", async () => {
  const result = await runBootstrap(dependencies({ createSession: async () => { throw new Error("session unavailable"); } }), 42, -94);
  assert.deepEqual(result, { ok: false, step: "createSession", message: "session unavailable" });
});

test("bootstrap reports failed location upload", async () => {
  const result = await runBootstrap(dependencies({ saveLocation: async () => { throw new Error("location upload failed"); } }), 42, -94);
  assert.deepEqual(result, { ok: false, step: "saveLocation", message: "location upload failed" });
});

test("bootstrap sends coordinates and uses the returned session token", async () => {
  let uploaded: unknown;
  const result = await runBootstrap(dependencies({
    saveLocation: async (token, latitude, longitude) => { uploaded = { token, latitude, longitude }; },
  }), 42.4975, -94.168);
  assert.deepEqual(uploaded, { token: "session-token", latitude: 42.4975, longitude: -94.168 });
  assert.equal(result.ok, true);
});

test("location validation preserves an optional town", () => {
  assert.deepEqual(validateLocation({ latitude: 42, longitude: -94, city: "Fort Dodge" }), {
    latitude: 42,
    longitude: -94,
    city: "Fort Dodge",
  });
});