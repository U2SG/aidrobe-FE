import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Fill, Shader, Skia, useClock } from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { WeatherContext } from '@/types/api';

import { normalizeWeatherVisual } from './weatherVisuals';

type Props = {
  weather: WeatherContext;
};

const TIMING = { duration: 900 };

function makeEffect() {
  try {
    return Skia.RuntimeEffect.Make(`
uniform float u_time;
uniform float2 u_resolution;
uniform float u_rain;
uniform float u_humidity;
uniform float u_wind;
uniform float u_warmth;
uniform float u_cloud;
uniform float u_fog;
uniform float u_seed;

float sat(float x) { return clamp(x, 0.0, 1.0); }

float hash12(float2 p) {
  p += float2(u_seed * 137.1, u_seed * 91.7);
  float3 p3 = fract(float3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash12(i), hash12(i + float2(1.0, 0.0)), u.x),
    mix(hash12(i + float2(0.0, 1.0)), hash12(i + float2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(float2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += noise(p) * amplitude;
    p = p * 2.03 + float2(8.4, -5.7);
    amplitude *= 0.5;
  }
  return value;
}

float rainLayer(float2 uv, float density, float speed, float phase) {
  float2 p = uv;
  p.x += p.y * (0.035 + u_wind * 0.12);
  p *= float2(density, density * 0.62);
  float2 cell = floor(p);
  float random = hash12(cell + phase);
  float2 local = fract(p);
  local.x = abs(local.x - (0.2 + random * 0.6));
  local.y = fract(local.y + u_time * speed + random);
  float line = smoothstep(0.026, 0.006, local.x);
  float taper = smoothstep(0.02, 0.16, local.y) * smoothstep(0.9, 0.42, local.y);
  return line * taper * step(0.44, random);
}

float condensation(float2 uv) {
  float2 p = uv * float2(18.0, 27.0);
  float2 cell = floor(p);
  float2 local = fract(p) - 0.5;
  float random = hash12(cell + 17.3);
  float radius = mix(0.035, 0.16, pow(random, 3.0));
  float drop = smoothstep(radius, radius * 0.55, length(local));
  float highlight = smoothstep(radius * 0.7, 0.0, length(local - float2(-radius * 0.2, -radius * 0.24)));
  return drop * (0.35 + highlight * 0.65) * step(0.62, random);
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / u_resolution;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  float time = u_time;

  float3 coolTop = float3(0.70, 0.82, 0.89);
  float3 warmTop = float3(0.95, 0.82, 0.64);
  float3 coolBottom = float3(0.90, 0.94, 0.94);
  float3 warmBottom = float3(0.98, 0.92, 0.80);
  float rainGate = max(u_rain, u_cloud * 0.35);
  float warmMix = u_warmth * (1.0 - rainGate * 0.68);
  float3 top = mix(coolTop, warmTop, warmMix);
  float3 bottom = mix(coolBottom, warmBottom, u_warmth * (1.0 - rainGate * 0.5));
  float vertical = smoothstep(0.0, 1.0, uv.y);
  float3 color = mix(top, bottom, vertical);

  float2 cloudUv = float2(uv.x * aspect, uv.y) * 2.4;
  cloudUv += float2(time * (0.006 + u_wind * 0.012), time * 0.002);
  float cloudNoise = fbm(cloudUv + float2(0.0, u_seed * 8.0));
  float cloudMask = smoothstep(0.34, 0.72, cloudNoise + u_cloud * 0.18);
  float3 cloudColor = mix(float3(0.95, 0.98, 0.98), float3(1.0, 0.96, 0.88), u_warmth * 0.45);
  color = mix(color, cloudColor, cloudMask * (0.16 + u_cloud * 0.32));

  float sun = exp(-length((uv - float2(0.78, 0.16)) * float2(aspect, 1.0)) * 8.5);
  color += float3(1.0, 0.83, 0.56) * sun * (1.0 - u_cloud) * 0.22;

  float fog = smoothstep(0.18, 0.98, vertical + fbm(cloudUv * 0.72) * 0.22);
  color = mix(color, float3(0.94, 0.96, 0.95), fog * u_fog * 0.32);

  // One shared diagonal cloud field, aligned with the established outfit
  // anchors. It makes the source-image whites read as weather, not cards.
  float2 drift = float2(sin(time * (0.16 + u_wind * 0.08)) * 0.008, 0.0);
  float mistA = exp(-dot((uv - float2(0.62, 0.29) - drift) / float2(0.3, 0.17), (uv - float2(0.62, 0.29) - drift) / float2(0.3, 0.17)) * 2.1);
  float mistB = exp(-dot((uv - float2(0.82, 0.45) + drift * 0.6) / float2(0.34, 0.24), (uv - float2(0.82, 0.45) + drift * 0.6) / float2(0.34, 0.24)) * 2.0);
  float mistC = exp(-dot((uv - float2(0.68, 0.62) - drift) / float2(0.36, 0.22), (uv - float2(0.68, 0.62) - drift) / float2(0.36, 0.22)) * 2.0);
  float mistD = exp(-dot((uv - float2(0.55, 0.76) + drift * 0.6) / float2(0.29, 0.16), (uv - float2(0.55, 0.76) + drift * 0.6) / float2(0.29, 0.16)) * 2.2);
  float garmentMist = sat(mistA + mistB + mistC + mistD);
  float mistStrength = min(0.96, 0.72 + u_cloud * 0.14 + u_fog * 0.08);
  color = mix(color, float3(0.985, 0.99, 0.98), garmentMist * mistStrength);

  float rainA = rainLayer(uv, 23.0, 0.42 + u_wind * 0.18, 4.0);
  float rainB = rainLayer(uv + float2(0.07, 0.12), 36.0, 0.66 + u_wind * 0.2, 11.0);
  float rain = max(rainA * 0.72, rainB * 0.38) * u_rain;
  color = mix(color, float3(0.82, 0.90, 0.94), rain * 0.72);

  float drops = condensation(uv) * smoothstep(0.22, 0.55, u_rain + u_humidity * 0.22);
  color = mix(color, float3(0.98, 1.0, 1.0), drops * 0.34);

  float edgeLight = smoothstep(0.72, 0.0, abs(uv.x - 0.5)) * 0.03;
  color += edgeLight;
  color = mix(color, float3(0.86, 0.91, 0.92), rainGate * 0.055);
  return half4(color, 1.0);
}
`);
  } catch {
    return null;
  }
}

const effect = makeEffect();

function localDateSeed() {
  const now = new Date();
  const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

function WeatherWindowBackdropComponent({ weather }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const reducedMotion = useReducedMotion();
  const target = useMemo(() => normalizeWeatherVisual(weather), [weather]);
  const seed = useMemo(localDateSeed, []);
  const clock = useClock();
  const rain = useSharedValue(target.rain);
  const humidity = useSharedValue(target.humidity);
  const wind = useSharedValue(target.wind);
  const warmth = useSharedValue(target.warmth);
  const cloud = useSharedValue(target.cloud);
  const fog = useSharedValue(target.fog);

  useEffect(() => {
    rain.value = withTiming(target.rain, TIMING);
    humidity.value = withTiming(target.humidity, TIMING);
    wind.value = withTiming(target.wind, TIMING);
    warmth.value = withTiming(target.warmth, TIMING);
    cloud.value = withTiming(target.cloud, TIMING);
    fog.value = withTiming(target.fog, TIMING);
  }, [cloud, fog, humidity, rain, target, warmth, wind]);

  const uniforms = useDerivedValue(() => ({
    u_time: reducedMotion ? 0 : clock.value / 1000,
    u_resolution: [size.width, size.height],
    u_rain: rain.value,
    u_humidity: humidity.value,
    u_wind: wind.value,
    u_warmth: warmth.value,
    u_cloud: cloud.value,
    u_fog: fog.value,
    u_seed: seed,
  }));

  return (
    <View
      pointerEvents="none"
      style={styles.root}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) =>
          current.width === width && current.height === height ? current : { width, height },
        );
      }}
    >
      {effect && size.width > 0 && size.height > 0 ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={effect} uniforms={uniforms} />
          </Fill>
        </Canvas>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#DCE8EC',
  },
});

export default memo(WeatherWindowBackdropComponent);
