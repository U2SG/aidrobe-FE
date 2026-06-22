import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { WeatherContext } from '@/types/api';

type WeatherBackdropProps = WeatherContext & {
  width: number;
  height: number;
};

type NormalizedWeather = {
  rain: number;
  humidity: number;
  wind: number;
  tempWarm: number;
  cloud: number;
  fog: number;
  blur: number;
};

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function parseWindScale(value?: string | null) {
  if (!value) return 0;
  const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function conditionRainLevel(condition: string, icon?: string | null) {
  const iconNum = Number.parseInt(icon ?? '', 10);
  const iconRain = Number.isFinite(iconNum) && iconNum >= 300 && iconNum < 400 ? 0.48 : 0;
  if (/暴雨|大雨|storm|heavy rain/i.test(condition)) return Math.max(iconRain, 0.9);
  if (/中雨|moderate rain/i.test(condition)) return Math.max(iconRain, 0.68);
  if (/小雨|阵雨|雨|rain|shower|drizzle/i.test(condition)) return Math.max(iconRain, 0.48);
  return iconRain;
}

function conditionFogBoost(condition: string, icon?: string | null) {
  const iconNum = Number.parseInt(icon ?? '', 10);
  const iconFog = Number.isFinite(iconNum) && iconNum >= 500 && iconNum < 600 ? 0.5 : 0;
  if (/雾|霾|fog|haze|mist/i.test(condition)) return Math.max(iconFog, 0.62);
  return iconFog;
}

function iconCloudiness(icon?: string | null) {
  const iconNum = Number.parseInt(icon ?? '', 10);
  if (!Number.isFinite(iconNum)) return 0.35;
  if (iconNum === 100 || iconNum === 150) return 0.05;
  if (iconNum >= 101 && iconNum <= 103) return 0.5;
  if (iconNum === 104 || iconNum === 154) return 0.9;
  if (iconNum >= 300 && iconNum < 400) return 0.78;
  if (iconNum >= 400 && iconNum < 600) return 0.7;
  return 0.35;
}

function conditionCloudiness(condition: string) {
  if (/阴|overcast/i.test(condition)) return 0.92;
  if (/多云|cloud/i.test(condition)) return 0.58;
  if (/晴|sun|clear/i.test(condition)) return 0.06;
  if (/雨|rain|shower|storm|drizzle/i.test(condition)) return 0.76;
  return 0.35;
}

function normalizeWeather(weather: WeatherContext): NormalizedWeather {
  const rain = clamp(
    Math.max(clamp(weather.rainProbability), conditionRainLevel(weather.condition, weather.icon)),
  );
  const humidity = clamp((weather.humidity ?? 58) / 100);
  const windScale = parseWindScale(weather.windScale);
  const windByScale = clamp(windScale / 9);
  const windBySpeed = clamp((weather.windSpeed ?? 0) / 55);
  const wind = Math.max(windByScale, windBySpeed);
  const tempWarm = clamp(weather.temperatureC / 30);
  const cloud = clamp(
    Math.max(iconCloudiness(weather.icon), conditionCloudiness(weather.condition)),
  );
  const fog = clamp(
    conditionFogBoost(weather.condition, weather.icon) + humidity * 0.1 + cloud * 0.06,
  );
  const blur = clamp(rain * 0.18 + humidity * 0.1 + fog * 0.12);
  return { rain, humidity, wind, tempWarm, cloud, fog, blur };
}

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashDateSeed(dateKey: string) {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

function seeded(seed: number, index: number, salt: number) {
  const x = Math.sin((seed * 1000 + index * 37.17 + salt * 19.31) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function WeatherBackdropWeb(props: WeatherBackdropProps) {
  const {
    width,
    height,
    temperatureC,
    feelsLikeC,
    rainProbability,
    condition,
    humidity,
    windDir,
    windScale,
    windSpeed,
    icon,
    locationName,
  } = props;
  const weather = useMemo(
    () =>
      normalizeWeather({
        temperatureC,
        feelsLikeC,
        rainProbability,
        condition,
        humidity,
        windDir,
        windScale,
        windSpeed,
        icon,
        locationName,
      }),
    [
      condition,
      feelsLikeC,
      humidity,
      icon,
      locationName,
      rainProbability,
      temperatureC,
      windDir,
      windScale,
      windSpeed,
    ],
  );
  const seed = useMemo(() => hashDateSeed(localDateKey()), []);
  if (width <= 0 || height <= 0) return null;

  const base = weather.tempWarm > 0.5 ? '#F5E6C8' : '#B8D4E8';
  const sky = weather.tempWarm > 0.5 ? '#FBF4E3' : '#E6F0F6';
  const cloudLight = weather.tempWarm > 0.45 ? '#F5F1E7' : '#E8ECEC';
  const cloudDark = '#8D989D';
  const rainGate = weather.rain >= 0.38 ? 1 : 0;
  const dropCount = rainGate ? 4 + Math.round(weather.rain * 4) : 0;
  const tilt = `${3 + weather.wind * 14}deg`;

  return (
    <View pointerEvents="none" style={[styles.root, { width, height, backgroundColor: base }]}>
      <View style={[styles.sky, { backgroundColor: sky, opacity: 0.72 }]} />
      <View style={[styles.sun, { opacity: (1 - weather.cloud) * (1 - weather.rain) * 0.42 }]} />
      <View
        style={[
          styles.cloudA,
          {
            left: -90 + seeded(seed, 1, 1) * 34,
            top: 58 + seeded(seed, 2, 1) * 42,
            backgroundColor: cloudLight,
            opacity: weather.cloud * 0.28,
          },
        ]}
      />
      <View
        style={[
          styles.cloudB,
          {
            right: -74 + seeded(seed, 3, 1) * 28,
            top: 145 + seeded(seed, 4, 1) * 60,
            backgroundColor: cloudDark,
            opacity: weather.cloud * 0.18,
          },
        ]}
      />
      <View
        style={[
          styles.cloudC,
          {
            left: width * 0.16,
            top: height * 0.32,
            backgroundColor: cloudLight,
            opacity: weather.cloud * 0.14,
          },
        ]}
      />
      <View style={[styles.fog, { opacity: weather.fog * 0.06 + weather.blur * 0.03 }]} />
      {Array.from({ length: 34 }).map((_, index) => {
        const size = 2 + Math.pow(seeded(seed, index, 3), 3) * 8;
        const left = seeded(seed, index, 5) * width;
        const top = seeded(seed, index, 7) * height;
        return (
          <View
            key={`micro-${index}`}
            style={[
              styles.micro,
              {
                left,
                top,
                width: size,
                height: size * 1.08,
                borderRadius: size,
                opacity: 0.04 + weather.humidity * 0.12 + weather.rain * 0.06,
              },
            ]}
          />
        );
      })}
      {Array.from({ length: dropCount }).map((_, index) => {
        const size = 30 + Math.pow(seeded(seed, index, 11), 3) * 58;
        const left = seeded(seed, index, 13) * (width - size);
        const top = seeded(seed, index, 17) * (height * 0.76);
        const trail = 70 + weather.rain * 92 + size * 0.9;
        return (
          <View
            key={`macro-${index}`}
            style={[styles.dropWrap, { left, top, transform: [{ rotate: tilt }] }]}
          >
            <View
              style={[
                styles.trail,
                {
                  top: -trail * 0.82,
                  left: size * 0.42,
                  height: trail,
                  opacity: 0.08 + weather.rain * 0.14,
                },
              ]}
            />
            <View
              style={[
                styles.drop,
                {
                  width: size,
                  height: size * 1.18,
                  borderRadius: size,
                  opacity: 0.24 + weather.rain * 0.25,
                },
              ]}
            >
              <View style={[styles.highlight, { width: size * 0.28, height: size * 0.16 }]} />
              <View style={[styles.meniscus, { width: size * 0.72, height: size * 0.72 }]} />
              <View style={[styles.shadow, { width: size * 0.62, height: size * 0.18 }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const absoluteFill = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  sky: {
    ...absoluteFill,
  },
  sun: {
    position: 'absolute',
    top: -72,
    right: -76,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#E9C886',
  },
  cloudA: {
    position: 'absolute',
    width: 360,
    height: 104,
    borderRadius: 52,
  },
  cloudB: {
    position: 'absolute',
    width: 300,
    height: 82,
    borderRadius: 41,
  },
  cloudC: {
    position: 'absolute',
    width: 220,
    height: 58,
    borderRadius: 29,
  },
  fog: {
    ...absoluteFill,
    backgroundColor: '#F3F7F6',
  },
  micro: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(245,250,255,0.12)',
  },
  dropWrap: {
    position: 'absolute',
  },
  trail: {
    position: 'absolute',
    width: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(232,244,250,0.78)',
  },
  drop: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
    backgroundColor: 'rgba(245,250,255,0.27)',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: '15%',
    left: '18%',
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,244,0.74)',
  },
  meniscus: {
    position: 'absolute',
    top: '8%',
    left: '7%',
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(244,251,255,0.35)',
  },
  shadow: {
    position: 'absolute',
    right: '12%',
    bottom: '8%',
    borderRadius: 99,
    backgroundColor: 'rgba(36,52,60,0.23)',
  },
});

export default memo(WeatherBackdropWeb);
