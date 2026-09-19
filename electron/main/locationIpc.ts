import type {
  NativeLocation,
  NativeLocationErrorCode,
  NativeLocationResult,
} from "./nativeLocation";

export async function requestLocation(
  getLocation: () => Promise<NativeLocation>,
): Promise<NativeLocationResult> {
  try {
    return { ok: true, location: await getLocation() };
  } catch (error: unknown) {
    const details = error as { code?: NativeLocationErrorCode; message?: string };
    return {
      ok: false,
      code: details.code ?? "helper-failed",
      message: details.message ?? "Windows location lookup failed.",
    };
  }
}