
export type CreateSessionResponse = {
    token: string;
}

export type LocationDto = {
    latitude: number;
    longitude: number;
};

export type GeoCoordinatesJsonLd = {
    "@type": "GeoCoordinates";
    latitude: number;
    longitude: number;
};

export type QuantitativeValueJsonLd = {
    "@type": "QuantitativeValue";
    value: number | null;
    unitText: string;
};

export type ForecastDto = {
    "@context": "https://schema.org";
    "@type": "WeatherForecast";
    geo: GeoCoordinatesJsonLd;
    name: string;
    description: string;
    temperature: QuantitativeValueJsonLd;
  windSpeed: string;
  windDirection: string;
    dateModified: string;
};

export type ForecastListDto = {
    "@context": "https://schema.org";
    "@type": "ItemList";
    geo: GeoCoordinatesJsonLd;
    dateModified: string;
    itemListElement: ForecastDto[];
};

export type LocationDtoJsonLd = {
    "@context": "https://schema.org";
    "@type": "Place";
    geo: GeoCoordinatesJsonLd;
    name: string;
    address: {
        "@type": "PostalAddress";
        addressLocality?: string | null;
        addressRegion?: string | null;
    } | null;
    dateModified?: string;
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
