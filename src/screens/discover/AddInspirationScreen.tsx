import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { addInspiration, addInspirationsBatch, addPdfStyleSource } from '@/api/style';
import { PrimaryButton } from '@/components/forms/PrimaryButton';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useTrack } from '@/hooks/useTrack';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { DiscoverStackParamList } from '@/types/navigation';
import { httpStatus } from '@/utils/http';
import { pickAndUploadImage, uploadErrorMessage } from '@/utils/imageUpload';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'AddInspiration'>;

type Mode = 'single' | 'batch' | 'pdf';

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
};

const MODES: { id: Mode; label: string }[] = [
  { id: 'single', label: '链接/图片' },
  { id: 'batch', label: '批量' },
  { id: 'pdf', label: 'PDF 杂志' },
];

const inputStyle = {
  backgroundColor: T.card,
  borderRadius: radius.md,
  paddingHorizontal: 14,
  paddingVertical: 13,
  ...type.body,
  color: T.ink,
  ...shadow.soft,
} as const;

export function AddInspirationScreen({ navigation }: Props) {
  const qc = useQueryClient();
  const track = useTrack();
  const showToast = useToastStore((s) => s.show);

  const [mode, setMode] = useState<Mode>('single');
  const [single, setSingle] = useState('');
  const [batch, setBatch] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  // Pick an image from the album and add it as an inspiration directly.
  const onPickImage = async () => {
    setUploading(true);
    try {
      const picked = await pickAndUploadImage('inspo');
      if (!picked) return;
      await addInspiration({ imageUrl: picked.url });
      qc.invalidateQueries({ queryKey: ['inspirations'] });
      track('inspiration_added', { mode: 'image' });
      showToast({ message: '已添加到灵感库', kind: 'success' });
      navigation.goBack();
    } catch (e) {
      showToast({ message: uploadErrorMessage(e), kind: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const batchUrls = batch
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  const canSubmit =
    mode === 'single' ? single.trim().length > 0 : mode === 'batch' ? batchUrls.length > 0 : pdfUrl.trim().length > 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === 'single') return addInspiration({ sourceUrl: single.trim() });
      if (mode === 'batch') return addInspirationsBatch(batchUrls);
      return addPdfStyleSource({ fileUrl: pdfUrl.trim(), title: pdfTitle.trim() || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspirations'] });
      track('inspiration_added', { mode });
      showToast({
        message: mode === 'pdf' ? 'PDF 已提交，处理中' : '已添加到灵感库',
        kind: 'success',
      });
      navigation.goBack();
    },
    onError: (err: unknown) => {
      if (mode === 'pdf' && httpStatus(err) === 503) {
        showToast({ message: 'PDF 摄取暂未开放', kind: 'error' });
      }
      // Other errors handled by the axios interceptor.
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Modal header */}
      <View
        style={{
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ ...type.title2, color: T.ink }}>添加灵感</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: T.card,
            alignItems: 'center',
            justifyContent: 'center',
            ...shadow.soft,
          }}
        >
          <SystemIcon name="x" size={16} color={T.ink} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: spacing.screen, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.secondaryElevated, borderRadius: radius.pill, padding: 4 }}>
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMode(m.id)}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  backgroundColor: active ? colors.elevated : 'transparent',
                  ...(active ? shadow.soft : {}),
                }}
              >
                <Text style={{ ...type.footnote, fontWeight: active ? '700' : '500', color: active ? T.ink : T.ink3 }}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.screen, gap: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {mode === 'single' ? (
          <>
            <Text style={{ ...type.footnote, color: T.ink3 }}>粘贴链接</Text>
            <TextInput
              value={single}
              onChangeText={setSingle}
              placeholder="https://..."
              placeholderTextColor={colors.quaternaryLabel}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={inputStyle}
            />
            <Text style={{ ...type.footnote, color: T.ink3, marginTop: 4 }}>或从相册选择</Text>
            <Pressable
              onPress={onPickImage}
              disabled={uploading}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 22,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: colors.separator,
                borderStyle: 'dashed',
              }}
            >
              {uploading ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <>
                  <SystemIcon name="photo" size={20} color={colors.accent} strokeWidth={1.8} />
                  <Text style={{ ...type.callout, color: T.ink2 }}>从相册选择（JPG / PNG / WebP）</Text>
                </>
              )}
            </Pressable>
          </>
        ) : null}

        {mode === 'batch' ? (
          <>
            <Text style={{ ...type.footnote, color: T.ink3 }}>每行一个链接，最多 20 个</Text>
            <TextInput
              value={batch}
              onChangeText={setBatch}
              placeholder={'https://...\nhttps://...'}
              placeholderTextColor={colors.quaternaryLabel}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              style={{ ...inputStyle, minHeight: 140, textAlignVertical: 'top' }}
            />
            <Text style={{ ...type.caption, color: T.ink3 }}>已识别 {batchUrls.length} 个链接</Text>
          </>
        ) : null}

        {mode === 'pdf' ? (
          <>
            <Text style={{ ...type.footnote, color: T.ink3 }}>PDF / 杂志文件链接</Text>
            <TextInput
              value={pdfUrl}
              onChangeText={setPdfUrl}
              placeholder="https://....pdf"
              placeholderTextColor={colors.quaternaryLabel}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={inputStyle}
            />
            <TextInput
              value={pdfTitle}
              onChangeText={setPdfTitle}
              placeholder="标题（可选）"
              placeholderTextColor={colors.quaternaryLabel}
              style={inputStyle}
            />
            <Text style={{ ...type.caption, color: T.ink3 }}>提交后后台解析，稍后在灵感库可见</Text>
          </>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.screen, paddingTop: 12, paddingBottom: 28 }}>
        <PrimaryButton
          label="添加到灵感库"
          onPress={() => mutation.mutate()}
          disabled={!canSubmit}
          loading={mutation.isPending}
        />
      </View>
    </View>
  );
}
