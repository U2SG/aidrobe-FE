import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getUserSettings, updateUserSettings } from '@/api/settings';
import { useLocationPrefStore } from '@/store/locationPref';
import { coordsValue, getCurrentCoords, reverseGeocodeLabel } from '@/utils/location';

// When the user opted into GPS, silently refresh their location every time the
// app becomes active (cold start + return-to-foreground). Never prompts: if the
// permission isn't already granted we just skip. Writes the backend only when
// the coords actually changed, then nudges the today recommendation so it can
// pick up weather for the new location.
export function useLocationSync() {
  const mode = useLocationPrefStore((s) => s.mode);
  const hydrated = useLocationPrefStore((s) => s.hydrated);
  const setLabel = useLocationPrefStore((s) => s.setLabel);
  const qc = useQueryClient();

  useEffect(() => {
    if (!hydrated || mode !== 'gps') return;

    let cancelled = false;
    const sync = async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (!perm.granted) return;
        const { longitude, latitude } = await getCurrentCoords();
        if (cancelled) return;
        const value = coordsValue(longitude, latitude);
        const label = await reverseGeocodeLabel(longitude, latitude);
        if (cancelled) return;
        if (label) setLabel(label);

        const current = await getUserSettings();
        if (cancelled || current.location === value) return;
        await updateUserSettings({ location: value });
        qc.invalidateQueries({ queryKey: ['userSettings'] });
        qc.invalidateQueries({ queryKey: ['todayRecommendation'] });
      } catch {
        // Best-effort: never block app entry on location/weather.
      }
    };

    void sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [hydrated, mode, qc, setLabel]);
}
