import type { WeatherContext } from '@/types/api';

export type WeatherVisualState = {
  rain: number;
  humidity: number;
  wind: number;
  warmth: number;
  cloud: number;
  fog: number;
};

export type WeatherWindowPalette = {
  top: string;
  bottom: string;
  cloud: string;
  rain: string;
};

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function probability(value: number) {
  return clamp(value > 1 ? value / 100 : value);
}

function parseWindScale(value?: string | null) {
  if (!value) return 0;
  const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function iconNumber(icon?: string | null) {
  const value = Number.parseInt(icon ?? '', 10);
  return Number.isFinite(value) ? value : null;
}

function conditionRain(condition: string, icon?: string | null) {
  const normalized = condition.toLowerCase();
  const code = iconNumber(icon);
  const iconRain = code != null && code >= 300 && code < 400 ? 0.48 : 0;
  if (/暴雨|大雨|storm|heavy rain/.test(normalized)) return Math.max(iconRain, 0.92);
  if (/中雨|moderate rain/.test(normalized)) return Math.max(iconRain, 0.7);
  if (/小雨|阵雨|雨|rain|shower|drizzle/.test(normalized)) return Math.max(iconRain, 0.48);
  if (/雪|snow|sleet/.test(normalized)) return 0.34;
  return iconRain;
}

function conditionCloud(condition: string, icon?: string | null) {
  const normalized = condition.toLowerCase();
  const code = iconNumber(icon);
  const iconCloud =
    code === 100 || code === 150
      ? 0.06
      : code != null && code >= 101 && code <= 103
        ? 0.52
        : code === 104 || code === 154
          ? 0.9
          : code != null && code >= 300 && code < 600
            ? 0.76
            : 0.34;
  if (/阴|overcast/.test(normalized)) return Math.max(iconCloud, 0.92);
  if (/多云|云|cloud/.test(normalized)) return Math.max(iconCloud, 0.58);
  if (/晴|sun|clear/.test(normalized)) return Math.min(iconCloud, 0.08);
  if (/雨|雪|rain|snow|shower|storm|drizzle/.test(normalized)) return Math.max(iconCloud, 0.76);
  return iconCloud;
}

function conditionFog(condition: string, icon?: string | null) {
  const normalized = condition.toLowerCase();
  const code = iconNumber(icon);
  const iconFog = code != null && code >= 500 && code < 600 ? 0.5 : 0;
  if (/雾|霾|fog|haze|mist/.test(normalized)) return Math.max(iconFog, 0.66);
  return iconFog;
}

export function normalizeWeatherVisual(weather: WeatherContext): WeatherVisualState {
  const rain = Math.max(
    probability(weather.rainProbability),
    conditionRain(weather.condition, weather.icon),
  );
  const humidity = clamp((weather.humidity ?? 58) / 100);
  const wind = Math.max(
    clamp(parseWindScale(weather.windScale) / 9),
    clamp((weather.windSpeed ?? 0) / 55),
  );
  const warmth = clamp((weather.temperatureC + 5) / 40);
  const cloud = conditionCloud(weather.condition, weather.icon);
  const fog = clamp(conditionFog(weather.condition, weather.icon) + humidity * 0.08 + cloud * 0.04);
  return { rain, humidity, wind, warmth, cloud, fog };
}

function mixChannel(a: number, b: number, amount: number) {
  return Math.round(a + (b - a) * clamp(amount));
}

function mixRgb(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  amount: number,
) {
  return `rgb(${mixChannel(a[0], b[0], amount)}, ${mixChannel(a[1], b[1], amount)}, ${mixChannel(a[2], b[2], amount)})`;
}

export function weatherWindowPalette(visual: WeatherVisualState): WeatherWindowPalette {
  const coolTop = [160, 191, 215] as const;
  const warmTop = [226, 211, 187] as const;
  const coolBottom = [211, 228, 239] as const;
  const warmBottom = [244, 233, 211] as const;
  const rainAmount = Math.max(visual.rain, visual.cloud * 0.35);
  const warmInfluence = visual.warmth * Math.pow(1 - rainAmount, 1.7) * 0.46;

  return {
    top: mixRgb(coolTop, warmTop, warmInfluence),
    bottom: mixRgb(coolBottom, warmBottom, warmInfluence * 0.7),
    cloud: mixRgb([231, 239, 243], [250, 242, 224], warmInfluence * 0.8),
    rain: mixRgb([88, 131, 163], [147, 132, 110], warmInfluence * 0.34),
  };
}
