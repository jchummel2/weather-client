export type NativeLocation = {
  latitude: number;
  longitude: number;
  city?: string | null;
};

export function validateLocation(value: unknown): NativeLocation {
  const location = value as Partial<NativeLocation> | null;
  if (
    !location ||
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number" ||
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    location.latitude < -90 ||
    location.latitude > 90 ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new Error("Windows returned invalid latitude or longitude values.");
  }

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    city: typeof location.city === "string" && location.city.trim() ? location.city.trim() : null,
  };
}