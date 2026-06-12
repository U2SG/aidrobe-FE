import { Circle, Svg } from 'react-native-svg';
import { Text, View } from 'react-native';

interface Props {
  minutes: number;
  max?: number;
}

export function CountdownRing({ minutes, max = 90 }: Props) {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(1, minutes / max);
  const dash = circumference * (1 - pct);

  const urgent = minutes <= 20;
  const tight = minutes <= 40;
  const color = urgent ? '#B85C4A' : tight ? '#B08D5B' : '#7A9B6E';

  return (
    <View style={{ width: 64, height: 64, position: 'relative' }}>
      <Svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx="32" cy="32" r={r} fill="none" stroke="#EBE3D5" strokeWidth="3" />
        <Circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${dash}`}
        />
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'serif',
            fontSize: 20,
            fontWeight: '600',
            color: '#1A1714',
            lineHeight: 22,
          }}
        >
          {minutes}
        </Text>
        <Text style={{ fontSize: 9, color: '#807468', marginTop: 1 }}>分钟</Text>
      </View>
    </View>
  );
}
