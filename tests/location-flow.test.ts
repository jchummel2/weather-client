import { expect, test } from "vitest";
import { runBootstrap } from "../electron/main/bootstrapFlow.ts";
import { requestLocation } from "../electron/main/locationIpc.ts";
import { validateLocation } from "../electron/main/locationValidation.ts";

const current = {
  "@context": "https://schema.org" as const,
  "@type": "WeatherForecast" as const,
  geo: { "@type": "GeoCoordinates" as const, latitude: 42, longitude: -94 },
  name: "Today",
  description: "Clear",
  temperature: { "@type": "QuantitativeValue" as const, value: 70, unitText: "F" },
  windSpeed: "5 mph",
  windDirection: "N",
  dateModified: "now",
};
const forecast = {
  "@context": "https://schema.org" as const,
  "@type": "ItemList" as const,
  geo: current.geo,
  dateModified: "now",
  itemListElement: [current],
};

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
  expect(result).toEqual({ ok: true, location: { latitude: 42.4975, longitude: -94.168 } });
});

test("IPC maps permission denial", async () => {
  const result = await requestLocation(async () => {
    throw Object.assign(new Error("Location access denied"), { code: "permission-denied" });
  });
  expect(result).toEqual({ ok: false, code: "permission-denied", message: "Location access denied" });
});

test("invalid coordinates are rejected", () => {
  expect(() => validateLocation({ latitude: 91, longitude: -94 })).toThrow(/invalid latitude/i);
  expect(() => validateLocation({ latitude: "42", longitude: -94 })).toThrow(/invalid latitude/i);
});

test("bootstrap reports failed session creation", async () => {
  const result = await runBootstrap(dependencies({ createSession: async () => { throw new Error("session unavailable"); } }), 42, -94);
  expect(result).toEqual({ ok: false, step: "createSession", message: "session unavailable" });
});

test("bootstrap reports failed location upload", async () => {
  const result = await runBootstrap(dependencies({ saveLocation: async () => { throw new Error("location upload failed"); } }), 42, -94);
  expect(result).toEqual({ ok: false, step: "saveLocation", message: "location upload failed" });
});

test("bootstrap sends coordinates and uses the returned session token", async () => {
  let uploaded: unknown;
  const result = await runBootstrap(dependencies({
    saveLocation: async (token, latitude, longitude) => { uploaded = { token, latitude, longitude }; },
  }), 42.4975, -94.168);
  expect(uploaded).toEqual({ token: "session-token", latitude: 42.4975, longitude: -94.168 });
  expect(result.ok).toBe(true);
});

test("location validation preserves an optional town", () => {
  expect(validateLocation({ latitude: 42, longitude: -94, city: "Fort Dodge" })).toEqual({
    latitude: 42,
    longitude: -94,
    city: "Fort Dodge",
  });
});