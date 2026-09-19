import type {
  ForecastDto,
  ForecastListDto,
} from "../../electron/main/backendApi.types";

export function WeatherScreen({
  current,
  forecast,
}: {
  current: ForecastDto;
  forecast: ForecastListDto;
}) {
  return (
    <div style={{ padding: 20 }}>
      <h2>Current</h2>

      <div>
        {current.shortForecast} {current.temperature}
        {current.temperatureUnit}
      </div>

      <h2>Forecast</h2>

      {forecast.periods.map((p) => (
        <div key={p.periodName}>
          {p.periodName}: {p.shortForecast} {p.temperature}
          {p.temperatureUnit}
        </div>
      ))}
    </div>
  );
}