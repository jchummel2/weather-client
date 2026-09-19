
export type CreateSessionResponse = {
    token: string;
}

export type LocationDto = {
    latitude: number;
    longitude: number;
}

export type ForecastDto = {
  periodName: string;
  shortForecast: string;
  temperature: number | null;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  fetchedAt: string;
};

export type ForecastListDto = {
  fetchedAt: string;
  periods: ForecastDto[];
};

export type BootstrapResult = 
    | {
        ok: true;
        success: true; 
        sessionToken: string;
        current: ForecastDto;
        forecast: ForecastListDto;
    }
    | {
        ok: false;
        step: "createSession" | "saveLocation" | "current" | "forecast";
        message: string;
    };
