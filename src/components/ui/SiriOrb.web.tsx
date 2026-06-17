import { View } from 'react-native';

export type SiriOrbVariant = 'ink' | 'vivid';

// Web fallback for the Skia runtime-shader orb. `@shopify/react-native-skia`
// needs CanvasKit loaded via LoadSkiaWeb() before any Skia API; without it the
// shader compile in SiriOrb.tsx throws at module-eval and white-screens the web
// bundle. Web isn't the primary target (native Android), so render a static,
// dependency-free orb that keeps the same footprint. Metro picks this `.web.tsx`
// over `SiriOrb.tsx` automatically.
export function SiriOrb({ size = 160, variant = 'ink' }: { size?: number; variant?: SiriOrbVariant }) {
  const body = variant === 'vivid' ? '#7E6BD6' : '#8C8B8E';
  const halo = variant === 'vivid' ? 'rgba(126,107,214,0.28)' : 'rgba(140,139,142,0.22)';
  const inner = variant === 'vivid' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.42)';
  const core = size * 0.68;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: halo,
        }}
      />
      <View
        style={{
          width: core,
          height: core,
          borderRadius: core / 2,
          backgroundColor: body,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: core * 0.42,
            height: core * 0.42,
            borderRadius: core * 0.21,
            backgroundColor: inner,
            marginTop: -core * 0.12,
            marginLeft: -core * 0.12,
          }}
        />
      </View>
    </View>
  );
}
