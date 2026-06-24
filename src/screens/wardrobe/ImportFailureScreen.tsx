import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SystemIcon } from '@/components/ui/SystemIcon';
import { colors, shadow } from '@/theme/design';
import type { WardrobeStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<WardrobeStackParamList, 'ImportFailure'>;

const P = {
  bg: '#F4F1EA',
  surface: '#FFFCF5',
  ink: '#151411',
  muted: '#777168',
  faint: '#A9A298',
  line: '#D9D4C8',
  rail: '#3E4B45',
  black: '#15120F',
};

const REASON_LABEL: Record<Props['route']['params']['reason'], string> = {
  upload_failed: '上传中断',
  unsupported_format: '格式不合适',
  too_large: '图片太大',
  recognition_failed: '没认出来',
  network_error: '网络断开',
};

const REASON_HINT: Record<Props['route']['params']['reason'], string> = {
  upload_failed: '上传通道没有完成，请重选一张或换个网络。',
  unsupported_format: '换成 JPEG、PNG 或 WebP。',
  too_large: '压缩到 10MB 以内再导入。',
  recognition_failed: '换一张背景更干净、衣物更完整的照片。',
  network_error: '网络恢复后再试一次。',
};

export function ImportFailureScreen({ navigation, route }: Props) {
  const { reason } = route.params;
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>导入失败</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.errorStage}>
          <View style={styles.stageRail} />
          <View style={styles.scanFrame}>
            <View style={styles.scanMark}>
              <SystemIcon name="exclamation" size={42} color={P.ink} strokeWidth={1.6} />
            </View>
          </View>
          <View style={styles.scanLine} />
          <Text style={styles.title}>{REASON_LABEL[reason]}</Text>
          <Text style={styles.hint}>{REASON_HINT[reason]}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => navigation.replace('AddItem')}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>重选图片</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.popToTop()}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>回到衣橱</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: P.bg,
  },
  header: {
    paddingTop: 58,
    paddingHorizontal: 26,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: P.ink,
  },
  body: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  errorStage: {
    minHeight: 420,
    borderRadius: 34,
    backgroundColor: P.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    ...shadow.elevated,
  },
  stageRail: {
    position: 'absolute',
    top: 42,
    left: 58,
    right: 58,
    height: 2,
    backgroundColor: P.ink,
    opacity: 0.18,
  },
  scanFrame: {
    width: 178,
    height: 178,
    borderRadius: 89,
    borderWidth: 1,
    borderColor: 'rgba(62,75,69,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },
  scanMark: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: P.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    top: 206,
    left: 48,
    right: 48,
    height: 1,
    backgroundColor: P.rail,
    opacity: 0.2,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: P.ink,
    textAlign: 'center',
  },
  hint: {
    marginTop: 12,
    maxWidth: 245,
    fontSize: 14,
    lineHeight: 22,
    color: P.muted,
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: 22,
    paddingBottom: 104,
    gap: 12,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 24,
    backgroundColor: P.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.inverse,
  },
  secondaryButton: {
    minHeight: 58,
    borderRadius: 24,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 17,
    fontWeight: '800',
    color: P.ink,
  },
  pressed: {
    opacity: 0.82,
  },
});
