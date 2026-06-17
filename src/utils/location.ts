import * as Location from 'expo-location';

// A backend `location` string is either a city name (manual) or "lng,lat" coords
// (GPS). QWeather wants longitude first, two decimals.
export const COORDS_RE = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;

export function isCoords(value: string | null | undefined): boolean {
  return !!value && COORDS_RE.test(value.trim());
}

export function coordsValue(longitude: number, latitude: number): string {
  return `${longitude.toFixed(2)},${latitude.toFixed(2)}`;
}

// Friendly city name for display so we never surface raw lng,lat to the user.
// Best-effort: returns null on web / permission / lookup failure.
export async function reverseGeocodeLabel(longitude: number, latitude: number): Promise<string | null> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!place) return null;
    return place.city || place.subregion || place.region || place.district || null;
  } catch {
    return null;
  }
}
