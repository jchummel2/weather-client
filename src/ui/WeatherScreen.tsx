import { useRef } from "react";
import type {
  ForecastDto,
  ForecastListDto,
  LocationDtoJsonLd,
} from "../../electron/main/backendApi.types";

export function WeatherScreen({
  current,
  forecast,
  location,
}: {
  current: ForecastDto;
  forecast: ForecastListDto;
  location: LocationDtoJsonLd;
}) {
  const locality = location.address?.addressLocality?.trim();
  const region = location.address?.addressRegion?.trim();
  const locationLabel = locality && region ? `${locality}, ${region}` : "Location unavailable";
  const forecastCarousel = useRef<HTMLDivElement>(null);

  function moveForecast(direction: "back" | "forward") {
    forecastCarousel.current?.scrollBy({
      left: direction === "forward" ? 260 : -260,
      behavior: "smooth",
    });
  }

  return (
    <main className="weather-screen">
      <header className="weather-header">
        <div>
          <p className="eyebrow">Local conditions</p>
          <h1>{locationLabel}</h1>
        </div>
        <p className="updated-label">Updated {formatUpdatedAt(current.dateModified)}</p>
      </header>

      <section className="current-conditions" aria-labelledby="current-heading">
        <p className="section-label" id="current-heading">Right now</p>
        <WeatherIcon condition={current.description} size="large" />
        <p className="current-temperature">
          {current.temperature.value ?? "--"}<span>{current.temperature.unitText}</span>
        </p>
        <h2>{current.description}</h2>
        <div className="current-details">
          <span>Wind {current.windSpeed}</span>
          <span>{current.windDirection}</span>
        </div>
      </section>

      <section className="forecast-section" aria-labelledby="forecast-heading">
        <div className="section-heading">
          <div>
            <h2 id="forecast-heading">Forecast</h2>
          </div>
          <div className="carousel-controls">
            <button type="button" aria-label="Show earlier forecast" onClick={() => moveForecast("back")}>←</button>
            <button type="button" aria-label="Show later forecast" onClick={() => moveForecast("forward")}>→</button>
          </div>
        </div>

        <div className="forecast-carousel" ref={forecastCarousel}>
          {forecast.itemListElement.map((period) => (
            <article className="forecast-card" key={period.name}>
              <div className="forecast-card-topline">
                <h3>{period.name}</h3>
                <WeatherIcon condition={period.description} />
              </div>
              <p className="forecast-temperature">
                {period.temperature.value ?? "--"}<span>{period.temperature.unitText}</span>
              </p>
              <p className="forecast-condition">{period.description}</p>
              <p className="forecast-wind">{period.windSpeed} · {period.windDirection}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function WeatherIcon({ condition, size = "small" }: { condition: string; size?: "small" | "large" }) {
  const normalizedCondition = condition.toLowerCase();
  const rainy = /rain|shower|storm|thunder/.test(normalizedCondition);
  const snowy = /snow|flurr/.test(normalizedCondition);
  const cloudy = /cloud|overcast|fog|haze/.test(normalizedCondition);

  return (
    <span className={`weather-icon weather-icon-${size} ${rainy ? "is-rainy" : ""} ${snowy ? "is-snowy" : ""} ${cloudy ? "is-cloudy" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 96 80" role="presentation">
        {!cloudy && !rainy && !snowy ? <circle className="sun-core" cx="48" cy="34" r="17" /> : null}
        {!cloudy && !rainy && !snowy ? <path className="sun-rays" d="M48 7v9M48 52v9M21 34h9M66 34h9M29 15l6 7M61 46l6 7M67 15l-6 7M35 46l-6 7" /> : null}
        {cloudy || rainy || snowy ? <path className="cloud-shape" d="M22 56h49a13 13 0 0 0 0-26 20 20 0 0 0-38-3 15 15 0 0 0-11 29Z" /> : null}
        {rainy ? <path className="rain-lines" d="m35 66-5 10m18-10-5 10m18-10-5 10" /> : null}
        {snowy ? <path className="snow-dots" d="M34 68h0m14 0h0m14 0h0" /> : null}
      </svg>
    </span>
  );
}