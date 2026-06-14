import { G, Path, Pattern, Line, Svg, Text as SvgText } from 'react-native-svg';

import { colors } from '@/theme/design';

type GarmentKind =
  | 'shirt'
  | 'blazer'
  | 'trousers'
  | 'sweater'
  | 'jeans'
  | 'dress'
  | 'skirt'
  | 'tee'
  | 'loafer'
  | 'sneaker'
  | 'bag';

interface Props {
  kind: GarmentKind;
  size?: number;
}

const PATHS: Record<GarmentKind, string> = {
  shirt:    'M30 14 L46 6 L60 12 L78 6 L92 14 L100 28 L92 36 L86 30 L86 92 C86 96 84 98 80 98 L42 98 C38 98 36 96 36 92 L36 30 L30 36 L22 28 Z',
  blazer:   'M28 16 L46 4 L62 16 L78 4 L96 16 L96 96 C96 100 94 102 90 102 L70 102 L62 64 L54 102 L34 102 C30 102 28 100 28 96 Z',
  trousers: 'M36 4 L88 4 L92 50 L84 102 L70 102 L62 56 L54 102 L40 102 L32 50 Z',
  sweater:  'M28 18 L42 8 C46 4 50 4 54 4 L70 4 C74 4 78 4 82 8 L96 18 L100 32 L90 42 L86 36 L86 92 C86 98 84 100 80 100 L44 100 C40 100 38 98 38 92 L38 36 L34 42 L24 32 Z',
  jeans:    'M34 6 L90 6 L92 48 L86 100 L72 100 L64 56 L60 56 L52 100 L38 100 L32 48 Z',
  dress:    'M40 10 L60 4 L84 10 L88 36 L96 96 C96 100 94 102 90 102 L34 102 C30 102 28 100 28 96 L36 36 Z',
  skirt:    'M30 12 L94 12 L102 96 C102 100 100 102 96 102 L28 102 C24 102 22 100 22 96 Z',
  tee:      'M22 20 L42 8 L62 14 L82 8 L102 20 L98 36 L86 32 L86 92 C86 96 84 98 80 98 L44 98 C40 98 38 96 38 92 L38 32 L26 36 Z',
  loafer:   'M14 50 L18 38 C24 30 38 28 50 28 C70 28 92 32 102 38 L110 50 L108 62 C108 66 104 68 100 68 L20 68 C16 68 14 66 14 62 Z',
  sneaker:  'M10 50 L18 36 C26 30 36 28 50 28 C76 28 96 36 110 50 L112 64 C112 68 110 70 106 70 L14 70 C10 70 8 68 8 64 Z',
  bag:      'M30 36 L94 36 L98 96 C98 100 96 102 92 102 L32 102 C28 102 26 100 26 96 Z M44 36 V26 C44 18 50 14 62 14 C74 14 80 18 80 26 V36',
};

const LABELS: Record<GarmentKind, string> = {
  shirt: '衬衫', blazer: '西装', trousers: '西裤', sweater: '针织',
  jeans: '牛仔', dress: '连衣裙', skirt: '半裙', tee: 'T恤',
  loafer: '乐福鞋', sneaker: '小白鞋', bag: '托特包',
};

export function GarmentSvg({ kind, size = 80 }: Props) {
  const patternId = `stripe-${kind}-${size}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 124 110">
      <Pattern
        id={patternId}
        patternUnits="userSpaceOnUse"
        width="4"
        height="4"
        patternTransform="rotate(45)"
      >
        <Line x1="0" y1="0" x2="0" y2="4" stroke="#000" strokeOpacity="0.04" strokeWidth="2" />
      </Pattern>
      <G>
        <Path d={PATHS[kind]} fill="#E7E5E0" stroke="#C9C5BE" strokeWidth="1.2" />
        <Path d={PATHS[kind]} fill={`url(#${patternId})`} />
      </G>
      <SvgText
        x="62"
        y="105"
        textAnchor="middle"
        fontSize="9"
        fill={colors.quaternaryLabel}
        fontFamily="Courier"
        letterSpacing="0.5"
      >
        {LABELS[kind]}
      </SvgText>
    </Svg>
  );
}
