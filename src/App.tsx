import { useState } from "react";
import { LaunchScreen } from "./ui/LaunchScreen";
import { ErrorScreen } from "./ui/ErrorScreen";
import { WeatherScreen } from "./ui/WeatherScreen";
import type { ForecastDto, ForecastListDto } from "../electron/main/backendApi.types";

type AppState =
  | { stage: "loading"; message: string }
  | { stage: "error"; message: string }
  | {
      stage: "ready";
      current: ForecastDto;
      forecast: ForecastListDto;
      approxLocation: { latitude: number; longitude: number; city?: string | null };
    };

export default function App() {
  const [state, setState] = useState<AppState>({ stage: "loading", message: "Starting…" });

  if (state.stage === "loading") {
    return (
      <LaunchScreen
        onDone={(current, forecast, approxLocation) =>
          setState({ stage: "ready", current, forecast, approxLocation })
        }
      />
    );
  }

  if (state.stage === "error") return <ErrorScreen message={state.message} />;

  return <WeatherScreen current={state.current} forecast={state.forecast} location={state.approxLocation} />;
}