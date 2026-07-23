import { createElement, memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { WeatherContext } from '@/types/api';

import { normalizeWeatherVisual, weatherWindowPalette } from './weatherVisuals';

type Props = {
  weather: WeatherContext;
};

function seeded(index: number, salt: number) {
  const value = Math.sin((index * 37.17 + salt * 19.31) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function WeatherWindowBackdropWeb({ weather }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const reducedMotion = useReducedMotion();
  const visual = useMemo(() => normalizeWeatherVisual(weather), [weather]);
  const palette = useMemo(() => weatherWindowPalette(visual), [visual]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const measure = () => {
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      setSize((current) =>
        current.width === rect.width && current.height === rect.height
          ? current
          : { width: rect.width, height: rect.height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const density = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size.width * density);
    canvas.height = Math.round(size.height * density);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    let frame = 0;
    let stopped = false;
    const startedAt = performance.now();

    const draw = (now: number) => {
      if (stopped) return;
      const elapsed = reducedMotion ? 0 : (now - startedAt) / 1000;
      const width = size.width;
      const height = size.height;
      context.setTransform(density, 0, 0, density, 0, 0);
      context.clearRect(0, 0, width, height);

      const sky = context.createLinearGradient(0, 0, width * 0.18, height);
      sky.addColorStop(0, palette.top);
      sky.addColorStop(1, palette.bottom);
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);

      const depth = context.createRadialGradient(
        width * 0.82,
        height * 0.42,
        0,
        width * 0.82,
        height * 0.42,
        width * 0.72,
      );
      depth.addColorStop(0, 'rgba(92,139,176,0.24)');
      depth.addColorStop(0.62, 'rgba(119,159,188,0.1)');
      depth.addColorStop(1, 'rgba(119,159,188,0)');
      context.fillStyle = depth;
      context.fillRect(0, 0, width, height);

      context.save();
      context.filter = `blur(${14 + visual.fog * 16}px)`;
      for (let index = 0; index < 9; index += 1) {
        const radius = width * (0.22 + seeded(index, 2) * 0.2);
        const travel = width + radius * 2;
        const x =
          ((seeded(index, 3) * travel + elapsed * (2 + visual.wind * 8) + index * 31) % travel) -
          radius;
        const y = height * (0.04 + seeded(index, 4) * 0.68);
        const cloud = context.createRadialGradient(x, y, radius * 0.12, x, y, radius);
        cloud.addColorStop(0, 'rgba(255,255,255,0.3)');
        cloud.addColorStop(0.58, 'rgba(235,243,247,0.13)');
        cloud.addColorStop(1, 'rgba(246,249,248,0)');
        context.fillStyle = cloud;
        context.globalAlpha = 0.22 + visual.cloud * 0.3;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();

      if (visual.cloud < 0.7) {
        const sun = context.createRadialGradient(
          width * 0.78,
          height * 0.14,
          0,
          width * 0.78,
          height * 0.14,
          width * 0.42,
        );
        sun.addColorStop(0, `rgba(255,223,158,${0.22 * (1 - visual.cloud)})`);
        sun.addColorStop(1, 'rgba(255,223,158,0)');
        context.fillStyle = sun;
        context.fillRect(0, 0, width, height);
      }

      // Keep Aidrobe's warm porcelain present inside the weather window. The
      // soft boundary reads as atmosphere/glass, not as a second white card.
      const porcelain = context.createRadialGradient(
        width * 0.01,
        height * 0.04,
        0,
        width * 0.02,
        height * 0.06,
        width * 0.68,
      );
      porcelain.addColorStop(0, 'rgba(250,247,240,0.94)');
      porcelain.addColorStop(0.5, 'rgba(250,247,240,0.62)');
      porcelain.addColorStop(1, 'rgba(250,247,240,0)');
      context.globalAlpha = 1;
      context.fillStyle = porcelain;
      context.fillRect(0, 0, width, height);

      // A single connected cloud corridor sits behind the whole outfit. Its
      // bright core absorbs near-white source mattes; the garment renderers
      // feather only their outer edge, so cream fabric stays crisp.
      context.save();
      context.globalCompositeOperation = 'screen';
      context.filter = `blur(${18 + visual.fog * 12}px)`;
      const mistStrength = Math.min(0.78, 0.56 + visual.cloud * 0.16 + visual.fog * 0.08);
      const drift = reducedMotion
        ? 0
        : Math.sin(elapsed * (0.16 + visual.wind * 0.08)) * width * 0.012;
      const corridor = [
        [0.62, 0.29, 0.34, 0.2],
        [0.82, 0.45, 0.36, 0.28],
        [0.68, 0.62, 0.38, 0.25],
        [0.55, 0.76, 0.31, 0.18],
      ] as const;
      corridor.forEach(([xRatio, yRatio, radiusX, radiusY], index) => {
        const x = width * xRatio + drift * (index % 2 === 0 ? 1 : -0.6);
        const y = height * yRatio;
        const radius = width * radiusX;
        const cloud = context.createRadialGradient(x, y, radius * 0.08, x, y, radius);
        cloud.addColorStop(0, `rgba(252,253,251,${mistStrength})`);
        cloud.addColorStop(0.62, `rgba(246,250,250,${mistStrength * 0.76})`);
        cloud.addColorStop(1, 'rgba(241,247,249,0)');
        context.fillStyle = cloud;
        context.beginPath();
        context.ellipse(x, y, radius, height * radiusY, -0.18, 0, Math.PI * 2);
        context.fill();
      });
      context.restore();

      const rainCount = Math.round(18 + visual.rain * 58);
      context.strokeStyle = palette.rain;
      context.lineCap = 'round';
      for (let index = 0; index < rainCount; index += 1) {
        const speed = 54 + seeded(index, 7) * 96 + visual.wind * 48;
        const startY = seeded(index, 8) * (height + 120);
        const y = ((startY + elapsed * speed) % (height + 120)) - 60;
        const x = seeded(index, 9) * (width + 40) - 20;
        const length = 9 + seeded(index, 10) * 23;
        context.globalAlpha = visual.rain * (0.12 + seeded(index, 11) * 0.22);
        context.lineWidth = 0.6 + seeded(index, 12) * 0.9;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + 2 + visual.wind * 7, y + length);
        context.stroke();
      }

      const dropCount = Math.round(8 + visual.rain * 22 + visual.humidity * 6);
      for (let index = 0; index < dropCount; index += 1) {
        const radius = 1.2 + Math.pow(seeded(index, 13), 3) * 5.8;
        const x = seeded(index, 14) * width;
        const baseY = seeded(index, 15) * height;
        const slide = reducedMotion ? 0 : elapsed * (2 + radius * 0.6);
        const y = (baseY + slide) % height;
        const drop = context.createRadialGradient(
          x - radius * 0.25,
          y - radius * 0.3,
          radius * 0.08,
          x,
          y,
          radius,
        );
        drop.addColorStop(0, 'rgba(255,255,255,0.48)');
        drop.addColorStop(0.52, 'rgba(240,248,251,0.13)');
        drop.addColorStop(1, 'rgba(110,143,162,0.12)');
        context.globalAlpha = Math.max(visual.rain, visual.humidity * 0.22);
        context.fillStyle = drop;
        context.beginPath();
        context.ellipse(x, y, radius * 0.76, radius, 0, 0, Math.PI * 2);
        context.fill();
      }

      const mist = context.createLinearGradient(0, height * 0.55, 0, height);
      mist.addColorStop(0, 'rgba(247,249,247,0)');
      mist.addColorStop(1, `rgba(238,245,247,${0.08 + visual.fog * 0.16})`);
      context.globalAlpha = 1;
      context.fillStyle = mist;
      context.fillRect(0, 0, width, height);

      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };

    draw(performance.now());
    return () => {
      stopped = true;
      if (frame) cancelAnimationFrame(frame);
    };
  }, [palette, reducedMotion, size, visual]);

  return (
    <View pointerEvents="none" style={[styles.root, { backgroundColor: palette.bottom }]}>
      {createElement('canvas', {
        ref: canvasRef,
        'aria-hidden': true,
        style: { display: 'block' },
      })}
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
    overflow: 'hidden',
  },
});

export default memo(WeatherWindowBackdropWeb);
