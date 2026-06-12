import { apiGet, apiPatch } from './client';
import type { ServerUserSettings, UpdateUserSettingsBody, UserSettings } from '@/types/api';

function toUserSettings(data: ServerUserSettings): UserSettings {
  return {
    departureTime: data.departure_time ?? null,
    deviceToken: data.device_token ?? null,
    pushEnabled: data.push_enabled ?? null,
    location: data.location ?? null,
  };
}

export async function getUserSettings() {
  return toUserSettings(await apiGet<ServerUserSettings>('/v1/user/settings'));
}

export async function updateUserSettings(body: UpdateUserSettingsBody) {
  return toUserSettings(
    await apiPatch<ServerUserSettings>('/v1/user/settings', {
      departure_time: body.departureTime,
      device_token: body.deviceToken,
      push_enabled: body.pushEnabled,
      location: body.location,
    }),
  );
}
