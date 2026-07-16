import { apiGet, apiPatch } from './client';
import type { LocalePref, ServerUserSettings, UpdateUserSettingsBody, UserSettings } from '@/types/api';

function toLocalePref(value: string | null | undefined): LocalePref | null {
  return value === 'zh-CN' || value === 'en-US' || value === 'system' ? value : null;
}

function toUserSettings(data: ServerUserSettings): UserSettings {
  return {
    departureTime: data.departure_time ?? null,
    timezone: data.timezone ?? null,
    deviceToken: data.device_token ?? null,
    pushEnabled: data.push_enabled ?? null,
    location: data.location ?? null,
    locale: toLocalePref(data.locale),
  };
}

export async function getUserSettings() {
  return toUserSettings(await apiGet<ServerUserSettings>('/v1/user/settings'));
}

export async function updateUserSettings(body: UpdateUserSettingsBody) {
  return toUserSettings(
    await apiPatch<ServerUserSettings>('/v1/user/settings', {
      departure_time: body.departureTime,
      timezone: body.timezone,
      device_token: body.deviceToken,
      push_enabled: body.pushEnabled,
      location: body.location,
      locale: body.locale,
    }),
  );
}
