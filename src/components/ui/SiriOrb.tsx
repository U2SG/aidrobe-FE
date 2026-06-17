import { Canvas, Fill, Shader, Skia, useClock } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

export type SiriOrbVariant = 'ink' | 'vivid';

// A Siri-style fluid orb rendered on the GPU via a Skia runtime shader.
// fbm noise + domain warp give the "living" internal churn; smoothstep builds the
// soft sphere and a fresnel rim. Two palettes share one shader:
//   - 'ink'   : low-saturation metallic grey + warm highlight (editorial-ink house
//               style) — used for the import processing / recognition states.
//   - 'vivid' : the high-saturation original Siri look — flowing cyan/magenta/purple.
const source = Skia.RuntimeEffect.Make(`
uniform float u_time;
uniform float2 u_resolution;
uniform float u_vivid; // 0 = ink (flat metallic), 1 = vivid (faux-3D glass)

float hash(float2 p){ p = fract(p*float2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float noise(float2 p){
  float2 i = floor(p), f = fract(p);
  float a=hash(i), b=hash(i+float2(1,0)), c=hash(i+float2(0,1)), d=hash(i+float2(1,1));
  float2 u = f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(float2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }

half4 main(float2 fragCoord){
  float2 uv = (fragCoord - 0.5*u_resolution) / u_resolution.y;
  float r = length(uv);
  float t = u_time;
  float R = 0.34;                              // sphere radius — leaves margin so the
                                               // round glow never reaches the square canvas edge (0.5)
  float mask = smoothstep(R, R-0.05, r);       // soft sphere body

  // ---- ink: flat metallic grey (unchanged look, used by the import flow) ----
  float2 q = uv*2.2;
  float nInk = fbm(q + float2(fbm(q + t*0.15), fbm(q - t*0.12)));
  float fresInk = smoothstep(R-0.03, R, r)*mask;
  float3 inkBase = mix(float3(0.10,0.11,0.12), float3(0.55,0.57,0.60), nInk);
  float3 inkCol  = mix(inkBase, float3(0.80,0.74,0.62), fresInk*0.6);
  inkCol += (1.0 - r/R) * 0.14 * mask;

  // ---- vivid: faux-3D glass sphere, coherent blue→violet→pink Siri gradient ----
  // per-pixel sphere normal — turns flat fill into curved glass
  float z = sqrt(max(0.0, R*R - r*r)) / R;     // 1 at center, 0 at the rim
  float3 N = normalize(float3(uv / R, max(z, 0.001)));
  float3 V = float3(0.0, 0.0, 1.0);            // view direction
  float3 L = normalize(float3(0.5, 0.7, 0.85));// key light
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 3.0);            // Schlick-style fresnel rim

  // ONE smooth gradient parameter — big soft regions (no confetti), but the
  // gradient AXIS rotates over time so the color visibly flows around the orb.
  float flow = fbm(uv*1.4 + float2(t*0.22, -t*0.18));
  float ang = t*0.45;                                  // rotating gradient axis
  float2 dir = float2(cos(ang), sin(ang));
  float g = 0.5 + 0.55*dot(N.xy, dir) + 0.22*(flow - 0.5);
  g = clamp(g, 0.0, 1.0);

  // 3-stop analogous palette — harmonious, not a rainbow
  float3 cBlue   = float3(0.20, 0.40, 0.98);
  float3 cViolet = float3(0.56, 0.30, 0.96);
  float3 cPink   = float3(0.98, 0.48, 0.74);
  float3 inner = g < 0.5 ? mix(cBlue, cViolet, g*2.0) : mix(cViolet, cPink, (g-0.5)*2.0);
  inner *= mix(0.92, 1.08, ndv);               // gentle core lift, no dark rim

  // luminous fresnel edge (glass brightens at the rim, never darkens)
  float3 rim = mix(cViolet, cPink, 0.5) * (fres*1.3);
  float spec = pow(clamp(dot(reflect(-L, N), V), 0.0, 1.0), 40.0);

  float3 vivCol = inner + rim + float3(spec*0.5);

  float3 col = mix(inkCol, vivCol, u_vivid);

  // soft luminous halo just beyond the rim — fades fully before the canvas edge
  float halo = (1.0 - smoothstep(R, R+0.11, r)) * (1.0 - mask) * 0.65;
  float3 haloCol = mix(float3(0.20,0.20,0.22), mix(cViolet, cPink, 0.4), u_vivid);

  float3 outRGB = col*mask + haloCol*halo;     // premultiplied
  float outA = clamp(mask + halo, 0.0, 1.0);
  return half4(half3(outRGB), half(outA));
}
`);

if (!source) throw new Error('SiriOrb: failed to compile runtime shader');
const effect = source;

export function SiriOrb({ size = 160, variant = 'ink' }: { size?: number; variant?: SiriOrbVariant }) {
  const clock = useClock(); // ms, driven on the UI thread
  const uniforms = useDerivedValue(() => ({
    u_time: clock.value / 1000,
    u_resolution: [size, size],
    u_vivid: variant === 'vivid' ? 1 : 0,
  }));

  return (
    <Canvas style={{ width: size, height: size }}>
      <Fill>
        <Shader source={effect} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
