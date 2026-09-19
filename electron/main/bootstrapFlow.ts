import type { ForecastDto, ForecastListDto } from "./backendApi.types";

export type BootstrapDependencies = {
  createSession: () => Promise<string>;
  saveLocation: (token: string, latitude: number, longitude: number) => Promise<void>;
  getCurrent: (token: string) => Promise<ForecastDto>;
  getForecast: (token: string) => Promise<ForecastListDto>;
};

export type BootstrapFlowResult =
  | { ok: true; sessionToken: string; current: ForecastDto; forecast: ForecastListDto }
  | { ok: false; step: "createSession" | "saveLocation" | "current" | "forecast"; message: string };

export async function runBootstrap(
  dependencies: BootstrapDependencies,
  latitude: number,
  longitude: number,
): Promise<BootstrapFlowResult> {
  let token: string;
  try {
    token = await dependencies.createSession();
  } catch (error: unknown) {
    return { ok: false, step: "createSession", message: errorMessage(error) };
  }

  try {
    await dependencies.saveLocation(token, latitude, longitude);
  } catch (error: unknown) {
    return { ok: false, step: "saveLocation", message: errorMessage(error) };
  }

  let current: ForecastDto;
  try {
    current = await dependencies.getCurrent(token);
  } catch (error: unknown) {
    return { ok: false, step: "current", message: errorMessage(error) };
  }

  try {
    const forecast = await dependencies.getForecast(token);
    return { ok: true, sessionToken: token, current, forecast };
  } catch (error: unknown) {
    return { ok: false, step: "forecast", message: errorMessage(error) };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}