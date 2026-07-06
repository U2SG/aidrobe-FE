import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { createImportTask } from '@/api/importTasks';
import { createPresignedUpload, uploadFileUriToPresigned } from '@/api/uploads';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, type as typeTokens } from '@/theme/design';
import type { OnboardingStackParamList } from '@/types/navigation';
import { compressImage, MAX_UPLOAD_BYTES } from '@/utils/image';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'AddWardrobe'>;

const TOTAL_STEPS = 6;
const CURRENT_STEP = 2;

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
  inverse: colors.inverse,
  divider: colors.separator,
} as const;

// Wardrobe flat-lay hero placeholder — a warm muted rectangle representing
// the garment collage shown in the prototype. The prototype specifies a
// "sample garment collage" whose actual asset is TBD; a placeholder is
// explicitly exempted from fidelity by the task spec.
function GarmentCollagePlaceholder() {
  return (
    <View
      style={{
        width: '100%',
        aspectRatio: 1.2,
        borderRadius: radius.lg,
        backgroundColor: colors.fill,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Three overlapping garment silhouette blocks */}
      <View
        style={{
          position: 'absolute',
          left: 32,
          top: 24,
          width: 110,
          height: 148,
          borderRadius: radius.sm,
          backgroundColor: colors.secondaryElevated,
          transform: [{ rotate: '-6deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 32,
          top: 12,
          width: 88,
          height: 118,
          borderRadius: radius.sm,
          backgroundColor: colors.separator,
          transform: [{ rotate: '5deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 72,
          bottom: 20,
          width: 120,
          height: 78,
          borderRadius: radius.sm,
          backgroundColor: colors.separatorSoft,
          transform: [{ rotate: '2deg' }],
        }}
      />
    </View>
  );
}

export function AddWardrobeScreen({ navigation }: Props) {
  const { t, locale } = useT();
  const showToast = useToastStore((state) => state.show);
  const [uploading, setUploading] = useState(false);

  const runImportPipeline = async (uri: string, sourceType: 'camera' | 'album') => {
    setUploading(true);
    try {
      const compressed = await compressImage(uri);
      const fileName = `wardrobe-${Date.now()}.jpg`;
      const presign = await createPresignedUpload({
        fileName,
        contentType: 'image/jpeg',
        maxContentLength: MAX_UPLOAD_BYTES,
      });
      await uploadFileUriToPresigned(presign, 'image/jpeg', compressed.uri, fileName);
      const task = await createImportTask({
        inputType: 'image',
        sourceType,
        imageUrl: presign.fileUrl,
        locale,
      });
      // ImportConfirm is re-hosted in the onboarding stack; onboarding:true makes
      // its post-save "next" continue onboarding (→ FirstOutfit → StyleMemory).
      navigation.navigate('ImportConfirm', { taskId: task.id, onboarding: true });
    } catch {
      showToast({ message: t('onboarding.addWardrobe.uploadFailed'), kind: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const pickFromCamera = async () => {
    if (uploading) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showToast({ message: t('onboarding.addWardrobe.cameraPermission'), kind: 'error' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] });
    if (!result.canceled && result.assets[0]) {
      void runImportPipeline(result.assets[0].uri, 'camera');
    }
  };

  const pickFromLibrary = async () => {
    if (uploading) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast({ message: t('onboarding.addWardrobe.albumPermission'), kind: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 1,
      mediaTypes: ['images'],
    });
    if (!result.canceled && result.assets[0]) {
      void runImportPipeline(result.assets[0].uri, 'album');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* ── Header: back arrow + step indicator ── */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 56,
          paddingBottom: 4,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <SystemIcon name="chevronLeft" size={24} color={T.ink} strokeWidth={2.2} />
        </Pressable>

        <Text style={{ ...typeTokens.caption, color: T.ink3, letterSpacing: 0.4 }}>
          {t('onboarding.addWardrobe.stepFraction')}
        </Text>
      </View>

      {/* ── Progress bar ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 6, gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 2,
                backgroundColor: i < CURRENT_STEP ? T.ink : T.divider,
              }}
            />
          ))}
        </View>
        <Text style={{ ...typeTokens.caption, color: T.ink3, letterSpacing: 0.4 }}>
          {String(CURRENT_STEP).padStart(2, '0')}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title + subtitle ── */}
        <Text style={{ ...typeTokens.largeTitle, color: T.ink }}>
          {t('onboarding.addWardrobe.title')}
        </Text>
        <Text
          style={{
            ...typeTokens.callout,
            color: T.ink2,
            marginTop: 12,
            lineHeight: 22,
          }}
        >
          {t('onboarding.addWardrobe.subtitle')}
        </Text>

        {/* ── Garment collage ── */}
        <View style={{ marginTop: 24 }}>
          <GarmentCollagePlaceholder />
        </View>

        {/* ── Info chip: sparkle + copy ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
            marginBottom: 28,
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: colors.accentSoft,
            borderRadius: radius.md,
          }}
        >
          <SystemIcon name="sparkle" size={15} color={T.accent} />
          <Text style={{ ...typeTokens.footnote, color: T.accent, flex: 1 }}>
            {t('onboarding.addWardrobe.sparkleHint')}
          </Text>
        </View>

        {/* ── Primary CTA: camera ── */}
        <Pressable
          onPress={pickFromCamera}
          disabled={uploading}
          style={({ pressed }) => ({
            height: 54,
            borderRadius: radius.md,
            backgroundColor: T.ink,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            opacity: uploading || pressed ? 0.72 : 1,
          })}
        >
          {uploading ? (
            <ActivityIndicator color={T.inverse} size="small" />
          ) : (
            <>
              <SystemIcon name="camera" size={18} color={T.inverse} strokeWidth={1.8} />
              <Text style={{ ...typeTokens.headline, color: T.inverse }}>
                {t('onboarding.addWardrobe.cta.camera')}
              </Text>
            </>
          )}
        </Pressable>

        {/* ── Secondary CTA: album ── */}
        <Pressable
          onPress={pickFromLibrary}
          disabled={uploading}
          style={({ pressed }) => ({
            height: 54,
            borderRadius: radius.md,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: T.ink,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            marginTop: 10,
            opacity: uploading || pressed ? 0.65 : 1,
          })}
        >
          <SystemIcon name="photo" size={18} color={T.ink} strokeWidth={1.8} />
          <Text style={{ ...typeTokens.headline, color: T.ink }}>
            {t('onboarding.addWardrobe.cta.album')}
          </Text>
        </Pressable>

        {/* ── Text link: other ways ── */}
        <Pressable
          onPress={() => navigation.navigate('StyleMemory')}
          disabled={uploading}
          style={({ pressed }) => ({
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 4,
            opacity: uploading || pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ ...typeTokens.callout, color: T.ink2 }}>
            {t('onboarding.addWardrobe.otherMethods')}
          </Text>
        </Pressable>

        {/* ── Footnote ── */}
        <Text
          style={{
            ...typeTokens.caption,
            color: T.ink3,
            textAlign: 'center',
            marginTop: 8,
            lineHeight: 18,
          }}
        >
          {t('onboarding.addWardrobe.footnote')}
        </Text>
      </ScrollView>
    </View>
  );
}
