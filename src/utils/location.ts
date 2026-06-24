import * as Location from 'expo-location';
import { Platform } from 'react-native';

import AmapLocation from '../../modules/amap-location';

// A backend `location` string is either a city name (manual) or "lng,lat" coords
// (GPS). QWeather wants longitude first, two decimals.
export const COORDS_RE = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;

export function isCoords(value: string | null | undefined): boolean {
  return !!value && COORDS_RE.test(value.trim());
}

export function coordsValue(longitude: number, latitude: number): string {
  return `${longitude.toFixed(2)},${latitude.toFixed(2)}`;
}

// expo-location's getCurrentPositionAsync has no timeout and can hang forever on
// Android when the fused provider never returns a fix. We try, in order:
//  1) a recent cached fix (instant),
//  2) a one-shot getCurrentPositionAsync (Balanced),
//  3) a streaming watchPositionAsync — on some devices/builds this delivers a fix
//     when the one-shot call silently hangs.
// Each network step is time-boxed so the spinner never stays up forever, and a
// total failure throws an error annotated with provider status for diagnosis.
const ONESHOT_TIMEOUT_MS = 12_000;
const WATCH_TIMEOUT_MS = 18_000;
const AMAP_TIMEOUT_MS = 16_000;
const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;

type Coords = { longitude: number; latitude: number };

function pick(c: { longitude: number; latitude: number }): Coords {
  return { longitude: c.longitude, latitude: c.latitude };
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(label)), ms),
  );
  return Promise.race([p, timeout]);
}

async function watchOnce(): Promise<Coords> {
  return new Promise<Coords>((resolve, reject) => {
    let sub: Location.LocationSubscription | null = null;
    const timer = setTimeout(() => {
      sub?.remove();
      reject(new Error('location watch timeout'));
    }, WATCH_TIMEOUT_MS);
    Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced }, (pos) => {
      clearTimeout(timer);
      sub?.remove();
      resolve(pick(pos.coords));
    })
      .then((s) => {
        sub = s;
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function getCurrentCoords(): Promise<Coords> {
  // China: expo-location's Google-backed provider can't reach Google and hangs.
  // Prefer the Amap (高德) SDK on Android, falling back to expo-location if Amap
  // fails (e.g. no API key configured) or on other platforms.
  if (Platform.OS === 'android') {
    try {
      return pick(await withTimeout(AmapLocation.getCurrentPosition(), AMAP_TIMEOUT_MS, 'amap timeout'));
    } catch {
      // fall through to expo-location.
    }
  }
  return expoCoords();
}

async function expoCoords(): Promise<Coords> {
  const last = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS }).catch(
    () => null,
  );
  if (last) return pick(last.coords);

  try {
    const { coords } = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      ONESHOT_TIMEOUT_MS,
      'location oneshot timeout',
    );
    return pick(coords);
  } catch {
    // one-shot hung/failed — fall through to the streaming watch.
  }

  try {
    return await watchOnce();
  } catch (err) {
    const status = await Location.getProviderStatusAsync().catch(() => null);
    const diag = status
      ? `gps=${status.gpsAvailable} net=${status.networkAvailable} svc=${status.locationServicesEnabled}`
      : 'provider status unavailable';
    throw new Error(`${(err as Error)?.message ?? 'locate failed'} [${diag}]`);
  }
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
