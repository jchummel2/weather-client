import { useState } from "react";
import { LaunchScreen } from "./ui/LaunchScreen";
import { ErrorScreen } from "./ui/ErrorScreen";
import { WeatherScreen } from "./ui/WeatherScreen";

export default function App() {
  const [state, setState] = useState<any>({ stage: "loading", message: "Starting…" });

  if (state.stage === "loading") {
    return (
      <LaunchScreen
        onDone={(current, forecast, approxLocation) =>
          setState({ stage: "ready", current, forecast, approxLocation })
        }
        onError={(message) => setState({ stage: "error", message })}
      />
    );
  }

  if (state.stage === "error") return <ErrorScreen message={state.message} />;

  return <WeatherScreen current={state.current} forecast={state.forecast} />;
}