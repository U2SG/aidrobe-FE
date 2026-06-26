import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/design';

type IconName =
  | 'home'
  | 'wardrobe'
  | 'person'
  | 'camera'
  | 'photo'
  | 'link'
  | 'share'
  | 'search'
  | 'slider'
  | 'bell'
  | 'chart'
  | 'shield'
  | 'clock'
  | 'sparkle'
  | 'chevronRight'
  | 'chevronLeft'
  | 'x'
  | 'check'
  | 'heart'
  | 'refresh'
  | 'trash'
  | 'more'
  | 'download'
  | 'exclamation'
  | 'recycle'
  | 'calendar'
  | 'compass'
  | 'suitcase'
  | 'bag'
  | 'bookmark'
  | 'plus';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}

export function SystemIcon({
  name,
  size = 22,
  color = colors.label,
  strokeWidth = 1.8,
  fill = 'none',
}: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      {name === 'home' ? (
        <>
          <Path {...common} d="M4 11.5 12 4l8 7.5" />
          <Path {...common} d="M6.5 10.5V20h11v-9.5" />
          <Path {...common} d="M10 20v-5h4v5" />
        </>
      ) : null}
      {name === 'wardrobe' ? (
        <>
          <Rect {...common} x="5" y="4" width="14" height="16" rx="2.5" />
          <Line {...common} x1="12" y1="4" x2="12" y2="20" />
          <Line {...common} x1="9" y1="11" x2="9" y2="13" />
          <Line {...common} x1="15" y1="11" x2="15" y2="13" />
        </>
      ) : null}
      {name === 'person' ? (
        <>
          <Circle {...common} cx="12" cy="8" r="3.2" />
          <Path {...common} d="M5.5 20c1.1-3.5 3.2-5.2 6.5-5.2s5.4 1.7 6.5 5.2" />
        </>
      ) : null}
      {name === 'camera' ? (
        <>
          <Path {...common} d="M8.2 7 9.6 5h4.8l1.4 2H19a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3.2Z" />
          <Circle {...common} cx="12" cy="13" r="3.5" />
        </>
      ) : null}
      {name === 'photo' ? (
        <>
          <Rect {...common} x="4" y="5" width="16" height="14" rx="2.5" />
          <Circle {...common} cx="9" cy="10" r="1.4" />
          <Path {...common} d="m5 17 4.2-4 3 2.6 2.7-3.1L20 17" />
        </>
      ) : null}
      {name === 'link' ? (
        <>
          <Path {...common} d="M10.2 7.8 11.6 6.4a4 4 0 0 1 5.7 5.7l-1.8 1.8a4 4 0 0 1-5.7 0" />
          <Path {...common} d="M13.8 16.2 12.4 17.6a4 4 0 0 1-5.7-5.7l1.8-1.8a4 4 0 0 1 5.7 0" />
          <Path {...common} d="m9.8 14.2 4.4-4.4" />
        </>
      ) : null}
      {name === 'share' ? (
        <>
          <Path {...common} d="M12 15V4" />
          <Path {...common} d="m8 8 4-4 4 4" />
          <Path {...common} d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" />
        </>
      ) : null}
      {name === 'search' ? (
        <>
          <Circle {...common} cx="10.5" cy="10.5" r="5.5" />
          <Path {...common} d="m15 15 4.5 4.5" />
        </>
      ) : null}
      {name === 'slider' ? (
        <>
          <Line {...common} x1="4" y1="7" x2="20" y2="7" />
          <Line {...common} x1="4" y1="17" x2="20" y2="17" />
          <Circle {...common} cx="9" cy="7" r="2" />
          <Circle {...common} cx="15" cy="17" r="2" />
        </>
      ) : null}
      {name === 'bell' ? (
        <>
          <Path {...common} d="M18 16H6c1.2-1.1 1.6-2.5 1.6-5.3a4.4 4.4 0 0 1 8.8 0c0 2.8.4 4.2 1.6 5.3Z" />
          <Path {...common} d="M10 18a2.2 2.2 0 0 0 4 0" />
        </>
      ) : null}
      {name === 'chart' ? (
        <>
          <Rect {...common} x="4" y="4" width="16" height="16" rx="3" />
          <Path {...common} d="M8 15v-3" />
          <Path {...common} d="M12 15V9" />
          <Path {...common} d="M16 15v-5" />
        </>
      ) : null}
      {name === 'shield' ? <Path {...common} d="M12 3.8 18 6v5.2c0 4.1-2.2 7-6 8.6-3.8-1.6-6-4.5-6-8.6V6l6-2.2Z" /> : null}
      {name === 'clock' ? (
        <>
          <Circle {...common} cx="12" cy="12" r="8" />
          <Path {...common} d="M12 7.5V12l3 2" />
        </>
      ) : null}
      {name === 'sparkle' ? (
        <>
          <Path {...common} d="M12 3.5 13.8 9l5.2 3-5.2 3L12 20.5 10.2 15 5 12l5.2-3L12 3.5Z" />
          <Path {...common} d="M5 4.5v3" />
          <Path {...common} d="M3.5 6h3" />
        </>
      ) : null}
      {name === 'chevronRight' ? <Path {...common} d="m9 5 7 7-7 7" /> : null}
      {name === 'chevronLeft' ? <Path {...common} d="m15 5-7 7 7 7" /> : null}
      {name === 'x' ? (
        <>
          <Path {...common} d="M6 6l12 12" />
          <Path {...common} d="M18 6 6 18" />
        </>
      ) : null}
      {name === 'check' ? <Path {...common} d="m5 12.5 4.2 4.2L19 7" /> : null}
      {name === 'heart' ? <Path {...common} d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /> : null}
      {name === 'refresh' ? (
        <>
          <Path {...common} d="M19 7v5h-5" />
          <Path {...common} d="M5 17v-5h5" />
          <Path {...common} d="M18 12A6 6 0 0 0 7.7 7.8L5 10.5" />
          <Path {...common} d="M6 12a6 6 0 0 0 10.3 4.2L19 13.5" />
        </>
      ) : null}
      {name === 'trash' ? (
        <>
          <Path {...common} d="M5 7h14" />
          <Path {...common} d="M10 7V5h4v2" />
          <Path {...common} d="M7 7l1 13h8l1-13" />
          <Path {...common} d="M10 11v5" />
          <Path {...common} d="M14 11v5" />
        </>
      ) : null}
      {name === 'more' ? (
        <>
          <Circle cx="6.5" cy="12" r="1.2" fill={color} />
          <Circle cx="12" cy="12" r="1.2" fill={color} />
          <Circle cx="17.5" cy="12" r="1.2" fill={color} />
        </>
      ) : null}
      {name === 'download' ? (
        <>
          <Path {...common} d="M12 4v10" />
          <Path {...common} d="m8 10 4 4 4-4" />
          <Path {...common} d="M5 19h14" />
        </>
      ) : null}
      {name === 'exclamation' ? (
        <>
          <Circle {...common} cx="12" cy="12" r="8" />
          <Path {...common} d="M12 7.5v5" />
          <Circle cx="12" cy="16.5" r="1" fill={color} />
        </>
      ) : null}
      {name === 'calendar' ? (
        <>
          <Rect {...common} x="4" y="5.5" width="16" height="14.5" rx="2.5" />
          <Line {...common} x1="4" y1="10" x2="20" y2="10" />
          <Line {...common} x1="8" y1="3.5" x2="8" y2="6.5" />
          <Line {...common} x1="16" y1="3.5" x2="16" y2="6.5" />
        </>
      ) : null}
      {name === 'compass' ? (
        <>
          <Circle {...common} cx="12" cy="12" r="8.2" />
          <Path {...common} d="m15 9-4.2 1.8L9 15l4.2-1.8L15 9Z" />
        </>
      ) : null}
      {name === 'suitcase' ? (
        <>
          <Rect {...common} x="4" y="8" width="16" height="11.5" rx="2.5" />
          <Path {...common} d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8" />
        </>
      ) : null}
      {name === 'bag' ? (
        <>
          <Path {...common} d="M6.5 8h11l-1 11.5h-9L6.5 8Z" />
          <Path {...common} d="M9.2 8V6.8a2.8 2.8 0 0 1 5.6 0V8" />
        </>
      ) : null}
      {name === 'bookmark' ? <Path {...common} d="M7 4.5h10v15l-5-3.4-5 3.4v-15Z" /> : null}
      {name === 'plus' ? (
        <>
          <Line {...common} x1="12" y1="5" x2="12" y2="19" />
          <Line {...common} x1="5" y1="12" x2="19" y2="12" />
        </>
      ) : null}
      {name === 'recycle' ? (
        <>
          <Path {...common} d="m8.5 8.2 2.1-3.4a1.5 1.5 0 0 1 2.6 0l1.2 2" />
          <Path {...common} d="m13.2 7 3.9.1-1.2-3.6" />
          <Path {...common} d="m16 11.2 2 3.5a1.5 1.5 0 0 1-1.3 2.3h-2.2" />
          <Path {...common} d="m14.8 14.8-2 3.4 3.7-.3" />
          <Path {...common} d="M9.5 17H7.3A1.5 1.5 0 0 1 6 14.7l1-1.8" />
          <Path {...common} d="m8.8 14.2-2-3.4-1.6 3.3" />
        </>
      ) : null}
    </Svg>
  );
}
