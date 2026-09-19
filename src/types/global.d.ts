import type { BootstrapResult } from "../../electron/main/backendApi.types";
import type { NativeLocationResult } from "../../electron/main/nativeLocation";

export {};

declare global {
  interface Window {
    appApi: {
      bootstrap: (latitude: number, longitude: number) => Promise<BootstrapResult>;
      createSession: () => Promise<string>;
      saveLocation: (lat: number, lon: number) => Promise<void>;
      getCurrent: () => Promise<import("../../electron/main/backendApi.types").ForecastDto>;
      getForecast: () => Promise<import("../../electron/main/backendApi.types").ForecastListDto>;
    };
    locationApi: {
      getCurrentLocation: () => Promise<NativeLocationResult>;
    };
  }
}