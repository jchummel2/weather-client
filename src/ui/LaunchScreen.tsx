import { useEffect, useState } from "react";
import type {
  ForecastDto,
  ForecastListDto,
} from "../../electron/main/backendApi.types";

export function LaunchScreen({
  onDone,
  onError,
}: {
  onDone: (current: ForecastDto, forecast: ForecastListDto, approxLocation: { latitude: number; longitude: number; city: string | null; region: string | null; country: string | null; }) => void;
  onError: (message: string) => void;
}) {
  const [message, setMessage] = useState("Starting…");
  const [manual, setManual] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        setMessage("Detecting location…");
        const loc = await window.appApi.getApproxLocation();

        if (cancelled) return;

        setMessage(`Loading weather for ${loc.city ?? "your area"}…`);

        const result = await window.appApi.bootstrap(loc.latitude, loc.longitude);

        if (cancelled) return;

        if (!result.ok) {
          onError(`${result.step}: ${result.message}`);
          return;
        }

        // Validate server response to avoid rendering with undefined props
        if (!result.current || !result.forecast) {
          onError("Invalid server response: missing current or forecast data");
          return;
        }

        onDone(result.current, result.forecast, loc);
      } catch (e: any) {
        // If geolocation failed (eg. Chromium tries Google geolocation and returns 403),
        // allow the user to enter a location manually instead of failing hard.
        setMessage("Automatic location failed — please enter location manually.");
        setManual(true);
      }
    }

    start();

    return () => {
      cancelled = true;
    };
  }, [onDone, onError]);

  return (
    <div style={{ padding: 40 }}>
      <div style={{ marginBottom: 12 }}>{message}</div>

      {manual ? (
        <ManualLocationForm
          onSubmit={async (lat, lon) => {
            setMessage("Starting with manual location…");
            try {
              const result = await window.appApi.bootstrap(lat, lon);
              if (!result.ok) {
                onError(`${result.step}: ${result.message}`);
                return;
              }
              onDone(result.current, result.forecast, { latitude: lat, longitude: lon, city: null, region: null, country: null });
            } catch (err: any) {
              onError(err?.message ?? "Manual startup failed");
            }
          }}
        />
      ) : null}
    </div>
  );
}

function ManualLocationForm({ onSubmit }: { onSubmit: (lat: number, lon: number) => Promise<void> | void }) {
  const [lat, setLat] = useState(0);
  const [lon, setLon] = useState(0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(Number(lat), Number(lon));
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <label>
          Latitude: <input value={lat} onChange={(e) => setLat(Number(e.target.value))} />
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>
          Longitude: <input value={lon} onChange={(e) => setLon(Number(e.target.value))} />
        </label>
      </div>
      <button type="submit">Use this location</button>
    </form>
  );
}