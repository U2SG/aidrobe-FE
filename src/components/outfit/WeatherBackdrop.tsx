import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Fill, Shader, Skia, useClock } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import type { WeatherContext } from '@/types/api';

/*
WeatherBackdrop v4 rain-on-glass rewrite

Performance budget:
- cheapBackground() remains the only sky/background function. main() evaluates it
  once for the base frame and once for the lens refraction: max 2 calls/pixel.
- cheapBackground() uses fbm3 (3 noise calls) + one fine noise call = 4 noise calls.
  Worst-case frame = 8 noise calls/pixel. Droplet layers are hash-only.
- No 9-tap blur. Wet-glass softness is a cheap contrast/tint blend.

Rain model:
- Dense static micro-droplet layer: small, low contrast condensation beads.
- Sparse sliding macro-droplet layer: large drops move downward with radius-scaled
  speed, leave a tapered trail above the drop, and include tiny residual beads.
- Both droplet layers use power-law radius distribution:
  r = rMin + (rMax - rMin) * pow(hash, 3.0), so small drops dominate and large
  drops are rare.
- A single extra cheapBackground(lensUv) call provides convex-lens refraction with
  inverted/magnified sampling and stronger nonlinear fisheye near the meniscus.
*/

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
  dark: number;
  blur: number;
};

const TIMING = { duration: 900 };

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
  const dark = clamp(cloud * 0.32 + rain * 0.13 + fog * 0.12);
  const blur = clamp(rain * 0.18 + humidity * 0.1 + fog * 0.12);
  return { rain, humidity, wind, tempWarm, cloud, fog, dark, blur };
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

function makeEffect() {
  try {
    return Skia.RuntimeEffect.Make(`
uniform float u_time;
uniform float2 u_resolution;
uniform float u_rain;
uniform float u_humidity;
uniform float u_wind;
uniform float u_tempWarm;
uniform float u_cloud;
uniform float u_fog;
uniform float u_dark;
uniform float u_blur;
uniform float u_seed;

const float PHI = 1.61803398875;

float sat(float x) { return clamp(x, 0.0, 1.0); }

float hash12(float2 p) {
  p += float2(u_seed * 173.31, u_seed * 91.17);
  float3 p3 = fract(float3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float a = hash12(i);
  float b = hash12(i + float2(1.0, 0.0));
  float c = hash12(i + float2(0.0, 1.0));
  float d = hash12(i + float2(1.0, 1.0));
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm3(float2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 2.02 + float2(11.7, -6.4);
    a *= 0.5;
  }
  return v;
}

float breath(float f, float phase) {
  return sin(u_time * f + phase) * 0.65 + sin(u_time * f * PHI + phase * 1.37) * 0.35;
}

float3 cheapBackground(float2 uv) {
  uv = clamp(uv, float2(0.0), float2(1.0));
  float y = sat(uv.y);

  float3 coolTop = float3(0.72, 0.83, 0.91);
  float3 coolBottom = float3(0.90, 0.94, 0.96);
  float3 warmTop = float3(0.96, 0.90, 0.78);
  float3 warmBottom = float3(0.99, 0.96, 0.88);
  float3 top = mix(coolTop, warmTop, u_tempWarm);
  float3 bottom = mix(coolBottom, warmBottom, u_tempWarm);
  float3 col = mix(top, bottom, smoothstep(0.0, 1.0, y));

  float phase = u_seed * 17.0 + breath(0.035, u_seed * 23.0) * 0.035;
  float caspect = u_resolution.y / max(u_resolution.x, 1.0);
  float2 cp = uv * float2(1.7, 1.7 * caspect * 0.82) + float2(phase, -phase * 0.55);
  float broad = fbm3(cp);
  float fine = noise(cp * 3.7 + float2(u_seed * 8.1, -u_seed * 4.2));
  float cloudLive = sat(u_cloud + breath(0.028, u_seed * 11.0) * 0.025);
  float field = broad + fine * 0.28;
  float cloudMass = smoothstep(0.30, 0.62, field) * cloudLive;
  float relief = (broad - 0.5) * 0.62 + (fine - 0.5) * 0.30;

  top = mix(top, float3(0.55, 0.61, 0.66), cloudLive * 0.40);
  bottom = mix(bottom, float3(0.74, 0.79, 0.81), cloudLive * 0.30);
  col = mix(mix(top, bottom, y), col, 0.52);

  float3 cloudLight = float3(0.90, 0.92, 0.92);
  float3 cloudDark = float3(0.46, 0.52, 0.57);
  float shade = sat(0.5 + relief * 1.25);
  float3 cloudCol = mix(cloudDark, cloudLight, shade);
  col = mix(col, cloudCol, cloudMass * (0.46 + cloudLive * 0.40));
  col += relief * cloudLive * 0.20;

  float sunGate = (1.0 - cloudLive * 0.92) * (1.0 - u_rain * 0.78) * (1.0 - u_fog * 0.55);
  float2 sunPos = float2(0.78 + (u_seed - 0.5) * 0.05, 0.16);
  float sun = pow(max(0.0, 1.0 - distance(uv, sunPos) * 1.9), 3.0);
  col += float3(1.0, 0.68, 0.28) * sun * sunGate * 0.36;

  col = mix(col, float3(0.86, 0.90, 0.90), u_fog * (0.10 + y * 0.10));
  col *= 1.0 - u_dark * 0.16;
  return col;
}

float4 microDroplets(float2 uv) {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  float wet = sat(u_rain * 0.72 + u_humidity * 0.38);
  float density = mix(13.0, 22.0, wet);
  float2 pUv = uv;
  pUv.x *= aspect;
  pUv += float2(u_seed * 3.1, u_seed * -2.4);
  float2 p = pUv * density;
  float2 base = floor(p);
  float2 local = fract(p) - 0.5;
  float best = 0.0;
  float2 bestQ = float2(0.0);
  float sparkle = 0.0;

  for (int yy = -1; yy <= 1; yy++) {
    for (int xx = -1; xx <= 1; xx++) {
      float2 cell = base + float2(float(xx), float(yy));
      float2 jitter = float2(hash12(cell + float2(1.7, 8.4)), hash12(cell + float2(9.2, 3.1))) - 0.5;
      jitter *= 0.82;
      float sizeHash = hash12(cell + float2(4.4, 12.6));
      float r = mix(0.006, 0.022, pow(sizeHash, 3.0));
      float visible = smoothstep(0.16, 0.72, wet) * smoothstep(0.18, 0.98, hash12(cell + float2(13.3, 2.8)));
      float2 q = local - jitter - float2(float(xx), float(yy));
      float2 qn = q / float2(r * 0.95, r * 1.05);
      float body = smoothstep(0.070, -0.020, length(qn) - 1.0) * visible;
      float replace = step(best, body);
      best = mix(best, body, replace);
      bestQ = mix(bestQ, qn, replace);
      float glint = pow(sat(1.0 - distance(qn, float2(-0.38, -0.42)) * 2.1), 10.0) * body;
      sparkle = max(sparkle, glint);
    }
  }
  return float4(sat(best), bestQ.x, bestQ.y, sat(sparkle));
}

float4 macroDroplets(float2 uv) {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  float rainLive = sat(u_rain + breath(0.05, u_seed * 29.0) * 0.018);
  float rainGate = smoothstep(0.34, 0.43, rainLive);
  float tilt = mix(0.02, 0.24, u_wind);
  float density = mix(2.45, 3.75, rainLive);
  float slide = u_time * mix(0.014, 0.052, rainLive) * (0.72 + u_wind * 0.55);

  float2 pUv = uv;
  pUv.x *= aspect;
  pUv.x += pUv.y * tilt;
  pUv.y += u_seed * 1.9 - slide;

  float2 p = pUv * float2(density, density * 1.12);
  float2 base = floor(p);
  float2 local = fract(p) - 0.5;
  float bestScore = 0.0;
  float bestBody = 0.0;
  float bestTrail = 0.0;
  float2 bestQ = float2(0.0);

  for (int yy = -1; yy <= 1; yy++) {
    for (int xx = -1; xx <= 1; xx++) {
      float2 cell = base + float2(float(xx), float(yy));
      float rnd = hash12(cell + float2(19.31, 4.27));
      float2 center = float2(hash12(cell + float2(3.7, 9.2)), hash12(cell + float2(11.9, 2.4))) - 0.5;
      center *= 0.78;
      float sizeHash = hash12(cell + float2(7.1, 13.3));
      float r = mix(0.048, 0.115, pow(sizeHash, 3.0)) * mix(0.92, 1.12, rainLive);
      float radius01 = sat((r - 0.048) / 0.067);
      float extraSlide = u_time * rainLive * (0.012 + radius01 * radius01 * 0.050);
      float2 q = local - center - float2(float(xx), float(yy));
      q.y -= extraSlide * density;
      q.x -= q.y * tilt * 1.15;

      float visible = smoothstep(0.50 - rainLive * 0.15, 0.98, rnd) * rainGate;
      float2 ellipse = float2(r * 0.76, r * 1.10);
      float2 qn = q / ellipse;
      float body = smoothstep(0.036, -0.018, length(qn) - 1.0) * visible;

      float trailY = max(-q.y - r * 0.12, 0.0);
      float trailLen = mix(0.30, 0.92, rainLive) * (0.55 + radius01 * 0.95 + u_wind * 0.35);
      float taper = 1.0 - smoothstep(0.0, trailLen, trailY) * 0.78;
      float bend = trailY * (tilt * 0.42 + (hash12(cell + float2(2.2, 15.4)) - 0.5) * 0.12);
      float trailWidth = max(0.010, r * 0.36 * taper);
      float trail = exp(-trailY * 3.0 / max(trailLen, 0.05));
      trail *= smoothstep(trailWidth, 0.0, abs(q.x + bend));
      trail *= smoothstep(0.0, r * 0.42, trailY) * visible * rainLive;
      float residueLane = fract(trailY * (7.5 + radius01 * 7.0) + hash12(cell + float2(5.8, 1.6)));
      float residue = smoothstep(0.90, 1.0, residueLane) * smoothstep(r * 0.22, 0.0, abs(q.x + bend));
      trail = sat(trail + residue * trail * 0.55);

      float score = max(body, trail * 0.44);
      float replace = step(bestScore, score);
      bestScore = mix(bestScore, score, replace);
      bestBody = mix(bestBody, body, replace);
      bestTrail = mix(bestTrail, trail, replace);
      bestQ = mix(bestQ, qn, replace);
    }
  }
  return float4(sat(bestBody), sat(bestTrail), bestQ.x, bestQ.y);
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / max(u_resolution, float2(1.0));
  float3 base = cheapBackground(uv);

  float wetGate = smoothstep(0.30, 0.46, u_rain);
  // Frosted wet glass: soften the sky (2 cheap offset taps), diffuse it milky and
  // slightly desaturated, then add fine sandblast grain. Strength tracks how wet
  // the glass is. Droplet lenses below still sample the SHARP background, so the
  // drops read as clear windows punched through the frost.
  float frost = sat(u_rain * 0.66 + u_humidity * 0.40 + u_fog * 0.55);
  float2 bpx = float2(2.6, 2.6) / max(u_resolution, float2(1.0));
  float3 blurBg = (cheapBackground(uv + bpx) + cheapBackground(uv - bpx)) * 0.5;
  float3 frosted = mix(base, blurBg, frost * 0.75);
  float luminance = dot(frosted, float3(0.30, 0.59, 0.11));
  frosted = mix(frosted, float3(luminance, luminance, luminance), frost * 0.24);
  frosted = mix(frosted, float3(0.92, 0.94, 0.95), frost * 0.32);
  float grain = noise(uv * float2(150.0, 300.0) + float2(u_seed * 27.0, u_seed * 19.0));
  float3 softBase = frosted + (grain - 0.5) * frost * 0.045;

  float4 micro = microDroplets(uv);
  float4 macro = macroDroplets(uv);
  float microBody = micro.x;
  float macroBody = macro.x;
  float trail = macro.y;
  float macroWeight = smoothstep(0.02, 0.14, macroBody);
  float2 qn = mix(micro.yz, macro.zw, macroWeight);
  float dropMask = sat(macroBody + microBody * 0.22);
  float dist = length(qn);
  float2 normal = normalize(qn + float2(0.0001, -0.0002));
  float fish = 1.0 + dist * dist * 1.65;
  float magnify = mix(0.018, 0.082, sat(u_rain + macroBody)) * (0.88 + u_humidity * 0.28);
  float2 lensUv = uv - qn * magnify * fish + normal * (1.0 - dist) * 0.007;
  float3 lens = cheapBackground(lensUv);
  lens = (lens - 0.5) * mix(1.04, 1.18, macroWeight) + 0.5;

  float3 col = mix(softBase, lens, sat(macroBody * 0.88 + microBody * 0.16));
  float spec = pow(sat(1.0 - distance(qn, float2(-0.36, -0.46)) * 2.05), 14.0) * dropMask;
  float rim = smoothstep(0.72, 1.05, dist) * dropMask;
  float crescent = rim * sat(0.74 - qn.x * 0.16 - qn.y * 0.42);
  float contact = pow(sat(1.0 - distance(qn, float2(0.10, 0.78)) * 1.45), 3.0) * dropMask;
  float microGlint = micro.w * (1.0 - macroWeight);

  col += float3(1.0, 0.98, 0.90) * spec * 0.72;
  col += float3(0.92, 0.98, 1.0) * crescent * 0.22;
  col += float3(1.0, 1.0, 0.94) * microGlint * 0.18;
  col -= float3(0.07, 0.09, 0.10) * contact * 0.34;
  col = mix(col, col - float3(0.018, 0.026, 0.032), trail * 0.34);
  col += float3(0.89, 0.96, 1.0) * trail * 0.11;

  float vignette = smoothstep(0.98, 0.18, distance(uv, float2(0.50, 0.46)));
  col *= mix(0.96, 1.0, vignette);
  return half4(half3(clamp(col, float3(0.0), float3(1.0))), half(1.0));
}
`);
  } catch {
    return null;
  }
}

const effect = makeEffect();

const absoluteFill = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

function FallbackBackdrop({
  width,
  height,
  weather,
  seed,
}: {
  width: number;
  height: number;
  weather: WeatherContext;
  seed: number;
}) {
  const normalized = normalizeWeather(weather);
  const base = normalized.tempWarm > 0.5 ? '#F5E6C8' : '#B8D4E8';
  const veil = normalized.cloud > 0.5 ? '#D2D8DA' : '#F6F1E5';
  const rainGate = normalized.rain >= 0.38 ? 1 : 0;
  const drops = rainGate ? 4 + Math.round(normalized.rain * 4) : 0;

  return (
    <View pointerEvents="none" style={[styles.root, { width, height, backgroundColor: base }]}>
      <View
        style={[
          styles.fallbackLayer,
          { backgroundColor: veil, opacity: 0.18 + normalized.cloud * 0.3 },
        ]}
      />
      <View
        style={[
          styles.fallbackSun,
          { opacity: (1 - normalized.cloud) * (1 - normalized.rain) * 0.36 },
        ]}
      />
      <View style={[styles.fallbackCloudA, { opacity: normalized.cloud * 0.2 }]} />
      <View style={[styles.fallbackCloudB, { opacity: normalized.cloud * 0.16 }]} />
      {Array.from({ length: 34 }).map((_, index) => {
        const x = ((seed * 619 + index * 0.137) % 1) * width;
        const y = ((seed * 337 + index * 0.191) % 1) * height;
        const size = 2 + Math.pow((seed * 83 + index * 0.073) % 1, 3) * 8;
        return (
          <View
            key={`micro-${index}`}
            style={[
              styles.fallbackMicro,
              {
                left: x,
                top: y,
                width: size,
                height: size * 1.08,
                borderRadius: size,
                opacity: 0.04 + normalized.humidity * 0.12 + normalized.rain * 0.06,
              },
            ]}
          />
        );
      })}
      {Array.from({ length: drops }).map((_, index) => {
        const x = ((seed * 997 + index * 0.173) % 1) * width;
        const y = ((seed * 463 + index * 0.257) % 0.76) * height;
        const size = 30 + Math.pow((seed * 211 + index * 0.113) % 1, 3) * 58;
        return (
          <View key={`macro-${index}`} style={[styles.fallbackDropWrap, { left: x, top: y }]}>
            <View
              style={[
                styles.fallbackTrail,
                {
                  top: -size * 1.5,
                  left: size * 0.42,
                  height: size * 1.9,
                  opacity: 0.08 + normalized.rain * 0.14,
                },
              ]}
            />
            <View
              style={[
                styles.fallbackDrop,
                {
                  width: size,
                  height: size * 1.18,
                  borderRadius: size,
                  opacity: 0.22 + normalized.rain * 0.25,
                },
              ]}
            >
              <View
                style={[styles.fallbackHighlight, { width: size * 0.28, height: size * 0.16 }]}
              />
              <View style={[styles.fallbackShadow, { width: size * 0.62, height: size * 0.18 }]} />
            </View>
          </View>
        );
      })}
      <View style={[styles.fallbackFog, { opacity: normalized.fog * 0.06 }]} />
    </View>
  );
}

function WeatherBackdropComponent(props: WeatherBackdropProps) {
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
  const seed = useMemo(() => hashDateSeed(localDateKey()), []);
  const target = useMemo(
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
  const clock = useClock();

  const rain = useSharedValue(target.rain);
  const humidityValue = useSharedValue(target.humidity);
  const wind = useSharedValue(target.wind);
  const tempWarm = useSharedValue(target.tempWarm);
  const cloud = useSharedValue(target.cloud);
  const fog = useSharedValue(target.fog);
  const dark = useSharedValue(target.dark);
  const blur = useSharedValue(target.blur);

  useEffect(() => {
    rain.value = withTiming(target.rain, TIMING);
    humidityValue.value = withTiming(target.humidity, TIMING);
    wind.value = withTiming(target.wind, TIMING);
    tempWarm.value = withTiming(target.tempWarm, TIMING);
    cloud.value = withTiming(target.cloud, TIMING);
    fog.value = withTiming(target.fog, TIMING);
    dark.value = withTiming(target.dark, TIMING);
    blur.value = withTiming(target.blur, TIMING);
  }, [blur, cloud, dark, fog, humidityValue, rain, target, tempWarm, wind]);

  const uniforms = useDerivedValue(() => ({
    u_time: clock.value / 1000,
    u_resolution: [width, height],
    u_rain: rain.value,
    u_humidity: humidityValue.value,
    u_wind: wind.value,
    u_tempWarm: tempWarm.value,
    u_cloud: cloud.value,
    u_fog: fog.value,
    u_dark: dark.value,
    u_blur: blur.value,
    u_seed: seed,
  }));

  if (width <= 0 || height <= 0) return null;
  if (!effect)
    return <FallbackBackdrop width={width} height={height} weather={props} seed={seed} />;

  return (
    <View pointerEvents="none" style={[styles.root, { width, height }]}>
      <Canvas style={{ width, height }}>
        <Fill>
          <Shader source={effect} uniforms={uniforms} />
        </Fill>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  fallbackLayer: {
    ...absoluteFill,
  },
  fallbackSun: {
    position: 'absolute',
    top: -80,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#E9C886',
  },
  fallbackCloudA: {
    position: 'absolute',
    top: 80,
    left: -80,
    width: 320,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#FFFFFF',
  },
  fallbackCloudB: {
    position: 'absolute',
    top: 180,
    right: -60,
    width: 280,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#8E999E',
  },
  fallbackMicro: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(245,250,255,0.12)',
  },
  fallbackDropWrap: {
    position: 'absolute',
  },
  fallbackTrail: {
    position: 'absolute',
    width: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(232,244,250,0.78)',
  },
  fallbackDrop: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
    backgroundColor: 'rgba(245,250,255,0.26)',
    overflow: 'hidden',
  },
  fallbackHighlight: {
    position: 'absolute',
    top: '16%',
    left: '18%',
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,244,0.72)',
  },
  fallbackShadow: {
    position: 'absolute',
    right: '12%',
    bottom: '8%',
    borderRadius: 99,
    backgroundColor: 'rgba(36,52,60,0.22)',
  },
  fallbackFog: {
    ...absoluteFill,
    backgroundColor: '#F4F7F6',
  },
});

export default memo(WeatherBackdropComponent);
