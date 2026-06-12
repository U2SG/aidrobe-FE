import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

import { Tag } from '@/components/ui/Tag';

// ── Types ────────────────────────────────────────────────────────────────────

export type GenUINodeType = 'heading' | 'subtext' | 'reason' | 'tags' | 'tip';

export interface GenUINode {
  id: string;
  type: GenUINodeType;
  props: Record<string, unknown>;
}

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error';

// ── Theme (matches TodayScreen palette) ──────────────────────────────────────

const C = {
  ink: '#1A1714',
  ink2: '#3A332B',
  ink3: '#807468',
  ink4: '#B8AC9D',
  accent: '#B08D5B',
  bgAlt: '#FAF6EE',
  divider: '#EBE3D5',
};

// ── Node renderers ───────────────────────────────────────────────────────────

function HeadingNode({ props }: { props: Record<string, unknown> }) {
  const text = String(props.text ?? '');
  const icon = String(props.icon ?? '');
  const emoji = icon === 'sparkle' ? '✦' : icon === 'shield' ? '🛡' : icon === 'clock' ? '⏱' : null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {emoji ? <Text style={{ fontSize: 15 }}>{emoji}</Text> : null}
      <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink, letterSpacing: -0.3 }}>
        {text}
      </Text>
    </View>
  );
}

function SubtextNode({ props }: { props: Record<string, unknown> }) {
  return (
    <Text style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>
      {String(props.text ?? '')}
    </Text>
  );
}

function ReasonNode({ props }: { props: Record<string, unknown> }) {
  return (
    <View style={{ padding: 12, backgroundColor: C.bgAlt, borderRadius: 12, marginTop: 4 }}>
      <Text style={{ fontSize: 12, color: C.ink2, lineHeight: 19 }}>
        &ldquo;{String(props.text ?? '')}&rdquo;
      </Text>
    </View>
  );
}

function TagsNode({ props }: { props: Record<string, unknown> }) {
  const items = Array.isArray(props.items) ? (props.items as string[]) : [];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
      {items.map((item, i) => (
        <Tag key={i}>{item}</Tag>
      ))}
    </View>
  );
}

function TipNode({ props }: { props: Record<string, unknown> }) {
  return (
    <Text style={{ fontSize: 10, color: C.ink3, lineHeight: 16 }}>
      · {String(props.text ?? '')}
    </Text>
  );
}

// ── Animated entrance wrapper ────────────────────────────────────────────────

function AnimatedNode({ children }: { children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 340, useNativeDriver: true }).start();
  }, [anim]);
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

// ── Skeleton placeholder (shown before first node arrives) ───────────────────

function SkeletonBar({ width, opacity }: { width: `${number}%` | number; opacity: number }) {
  return (
    <View
      style={{
        height: 12,
        width,
        backgroundColor: C.divider,
        borderRadius: 6,
        opacity,
      }}
    />
  );
}

function StreamingPlaceholder() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);
  return (
    <Animated.View style={{ gap: 10, opacity: pulse }}>
      <SkeletonBar width="55%" opacity={1} />
      <SkeletonBar width="38%" opacity={0.7} />
      <View style={{ height: 52, backgroundColor: C.bgAlt, borderRadius: 12, marginTop: 4 }} />
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <SkeletonBar width={70} opacity={0.8} />
        <SkeletonBar width={60} opacity={0.65} />
        <SkeletonBar width={74} opacity={0.5} />
      </View>
    </Animated.View>
  );
}

// ── Blinking cursor (shown after last node while still streaming) ─────────────

function StreamingCursor() {
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ).start();
  }, [blink]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
      <Animated.View
        style={{
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: C.accent,
          opacity: blink,
        }}
      />
      <Text style={{ fontSize: 10, color: C.ink4 }}>AI 正在生成</Text>
    </View>
  );
}

// ── Main renderer ────────────────────────────────────────────────────────────

interface GenUIRendererProps {
  nodes: GenUINode[];
  isStreaming?: boolean;
}

export function GenUIRenderer({ nodes, isStreaming = false }: GenUIRendererProps) {
  if (isStreaming && nodes.length === 0) {
    return <StreamingPlaceholder />;
  }

  return (
    <View style={{ gap: 4 }}>
      {nodes.map((node) => (
        <AnimatedNode key={node.id}>
          {node.type === 'heading' && <HeadingNode props={node.props} />}
          {node.type === 'subtext' && <SubtextNode props={node.props} />}
          {node.type === 'reason' && <ReasonNode props={node.props} />}
          {node.type === 'tags' && <TagsNode props={node.props} />}
          {node.type === 'tip' && <TipNode props={node.props} />}
        </AnimatedNode>
      ))}
      {isStreaming && <StreamingCursor />}
    </View>
  );
}
