import { useCallback, useEffect, useState } from "react";
import type { ForecastDto, ForecastListDto } from "../../electron/main/backendApi.types";

type LocationState = "idle" | "loading" | "success" | "permission-denied" | "unavailable" | "error";

export function LaunchScreen({
  onDone,
}: {
  onDone: (current: ForecastDto, forecast: ForecastListDto, location: { latitude: number; longitude: number; city?: string | null }) => void;
}) {
  const [state, setState] = useState<LocationState>("idle");
  const [message, setMessage] = useState("Use the Weatherly service to load local weather.");

  const requestCurrentLocation = useCallback(async () => {
    setState("loading");
    setMessage("Asking the Weatherly service for your location…");

    try {
      const locationResult = await window.locationApi.getCurrentLocation();
      if (!locationResult.ok) {
        const locationState = locationResult.code === "permission-denied" || locationResult.code === "disabled"
          ? "permission-denied"
          : locationResult.code === "unavailable" || locationResult.code === "timeout"
            ? "unavailable"
            : "error";
        setState(locationState);
        setMessage(locationResult.message);
        return;
      }

      setState("success");
      setMessage("Location found. Loading weather…");
      const { latitude, longitude } = locationResult.location;
      const result = await window.appApi.bootstrap(latitude, longitude);

      if (!result.ok) {
        setState("error");
        setMessage(`${result.step}: ${result.message}`);
        return;
      }
      if (!result.current || !result.forecast) {
        setState("error");
        setMessage("Invalid server response: missing current or forecast data");
        return;
      }

      onDone(result.current, result.forecast, { latitude, longitude });
    } catch (error: unknown) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Location startup failed.");
    }
  }, [onDone]);

  useEffect(() => {
    void requestCurrentLocation();
  }, [requestCurrentLocation]);

  const canRetry = state !== "loading";

  return (
    <main className="launch-screen">
      <section className="launch-panel" aria-live="polite">
        <p className="eyebrow">Weatherly service</p>
        <h1>Local weather, without typing.</h1>
        <p className="launch-message">{message}</p>

        {state === "permission-denied" ? (
          <p role="alert" className="launch-help">
            Allow location access for Weatherly in Windows Settings, then try again.
          </p>
        ) : null}
        {state === "unavailable" ? (
          <p role="alert" className="launch-help">
            Weatherly could not find a location provider. Check Windows Location Services and try again.
          </p>
        ) : null}
        {state === "error" ? <p role="alert" className="launch-help">Try again or check that the weather service is running.</p> : null}

        <button type="button" onClick={() => void requestCurrentLocation()} disabled={!canRetry}>
          {state === "loading" ? "Finding your location…" : "Use my current location"}
        </button>
      </section>
    </main>
  );
}
