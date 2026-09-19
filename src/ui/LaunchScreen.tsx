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
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const latitude = Number(lat);
    const longitude = Number(lon);

    if (!lat.trim() || !lon.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError("Enter numeric latitude and longitude values.");
      return;
    }

    if (latitude < -90 || latitude > 90) {
      setError("Latitude must be between -90 and 90.");
      return;
    }

    if (longitude < -180 || longitude > 180) {
      setError("Longitude must be between -180 and 180.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(latitude, longitude);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <label>
          Latitude: <input type="number" step="any" min="-90" max="90" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="38.9072" required />
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>
          Longitude: <input type="number" step="any" min="-180" max="180" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="-77.0369" required />
        </label>
      </div>
      {error ? <div role="alert" style={{ marginBottom: 8 }}>{error}</div> : null}
      <button type="submit" disabled={submitting}>
        {submitting ? "Loading weather…" : "Use this location"}
      </button>
    </form>
  );
}