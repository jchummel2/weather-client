import type { BootstrapResult } from "../../electron/main/backendApi.types";

export {};

declare global {
  interface Window {
    appApi: {
      bootstrap: (latitude: number, longitude: number) => Promise<BootstrapResult>;
      getApproxLocation: () => Promise<{
        latitude: number;
        longitude: number;
        city: string | null;
        region: string | null;
        country: string | null;
      }>;
      createSession: () => Promise<string>;
      saveLocation: (lat: number, lon: number) => Promise<void>;
      getCurrent: () => Promise<import("../../electron/main/backendApi.types").ForecastDto>;
      getForecast: () => Promise<import("../../electron/main/backendApi.types").ForecastListDto>;
    };
  }
}