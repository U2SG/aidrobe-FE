import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { confirmImportTask, getImportTask } from '@/api/importTasks';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { GarmentSvg } from '@/components/ui/GarmentSvg';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useTrack } from '@/hooks/useTrack';
import { useImportDraftStore } from '@/store/importDraft';
import { colors, shadow } from '@/theme/design';
import type { ConfirmImportTaskBody, ItemCategory } from '@/types/api';
import type { WardrobeStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<WardrobeStackParamList, 'ImportConfirm'>;

const T = {
  bg: colors.groupedBackground,
  bgAlt: colors.background,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  cardInner: colors.background,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  ink4: colors.quaternaryLabel,
  divider: colors.separator,
  accent: colors.accent,
  ok: colors.success,
  shadowSm: shadow.soft,
};

const CATEGORY_OPTIONS: { id: ItemCategory; label: string }[] = [
  { id: 'top', label: '上衣' },
  { id: 'bottom', label: '下装' },
  { id: 'outerwear', label: '外套' },
  { id: 'dress', label: '连衣裙' },
  { id: 'shoes', label: '鞋' },
  { id: 'accessory', label: '配饰' },
];

const FIT_OPTIONS = [
  { id: 'fitted', label: 'fitted' },
  { id: 'regular', label: 'regular' },
  { id: 'relaxed', label: 'relaxed' },
  { id: 'oversized', label: 'oversized' },
] as const;

export function ImportConfirmScreen({ navigation, route }: Props) {
  const { taskId } = route.params;
  const qc = useQueryClient();
  const resetDraft = useImportDraftStore((state) => state.reset);
  const localImageUri = useImportDraftStore((state) => state.localImageUri);
  const track = useTrack();

  const query = useQuery({
    queryKey: ['importTask', taskId],
    queryFn: () => getImportTask(taskId),
    refetchInterval: (queryInfo) =>
      queryInfo.state.data?.status === 'waiting_confirm' ||
      queryInfo.state.data?.status === 'failed'
        ? false
        : 1500,
  });

  const [form, setForm] = useState<ConfirmImportTaskBody>({ name: '', category: 'top', color: '' });
  const [selectedFit, setSelectedFit] = useState('regular');
  const [saving, setSaving] = useState(false);

  useEffect(() => { track('import_confirm_viewed', { taskId }); }, [taskId, track]);

  useEffect(() => {
    const data = query.data;
    if (!data) return;
    if (data.status === 'failed') {
      navigation.replace('ImportFailure', { reason: data.errorReason ?? 'recognition_failed' });
      return;
    }
    if (data.status === 'waiting_confirm' && data.recognized) {
      setForm({
        name: data.recognized.name ?? '',
        category: data.recognized.category ?? 'top',
        color: data.recognized.color ?? '',
      });
    }
  }, [query.data, navigation]);

  const data = query.data;
  if (!data || data.status !== 'waiting_confirm') {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
        <LoadingBlock label="正在识别衣物" />
      </View>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await confirmImportTask(taskId, form);
      track('item_saved', { taskId });
      qc.invalidateQueries({ queryKey: ['wardrobeItems'] });
      qc.invalidateQueries({ queryKey: ['todayRecommendation'] });
      resetDraft();
      navigation.popToTop();
    } finally {
      setSaving(false);
    }
  };

  const imageUri = localImageUri ?? data.imageUrl ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Nav */}
      <View style={{ paddingTop: 52, paddingHorizontal: 16, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable onPress={() => navigation.popToTop()}>
          <SystemIcon name="x" size={22} color={T.ink2} />
        </Pressable>
        <Text style={{ fontSize: 13, color: T.ink2 }}>识别 1 / 1</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 26, fontWeight: '600', color: T.ink, lineHeight: 32, marginBottom: 6 }}>
          确认一下识别结果
        </Text>
        <Text style={{ fontSize: 12, color: T.ink3, marginBottom: 18 }}>
          有 92% 把握，但你最了解自己的衣服。
        </Text>

        {/* Image */}
        <View
          style={{
            height: 240,
            backgroundColor: T.card,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            ...T.shadowSm,
            marginBottom: 18,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          ) : (
            <GarmentSvg kind="shirt" size={150} />
          )}
          <View
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: 'rgba(26,23,20,0.8)',
              borderRadius: 999,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#9ED9A1' }} />
            <Text style={{ fontSize: 10, color: '#fff', fontFamily: 'monospace', letterSpacing: 0.5 }}>
              AI · 92% 置信度
            </Text>
          </View>
        </View>

        {/* Name field */}
        <View style={{ backgroundColor: T.card, borderRadius: 14, padding: 14, marginBottom: 12, ...T.shadowSm }}>
          <Text style={{ fontSize: 11, color: T.ink3, marginBottom: 6 }}>名称</Text>
          <TextInput
            value={form.name}
            onChangeText={(name) => setForm((c) => ({ ...c, name }))}
            placeholder="给它起个名字"
            placeholderTextColor={T.ink4}
            style={{ fontSize: 17, fontWeight: '600', color: T.ink }}
          />
        </View>

        {/* Category */}
        <FieldGroup label="品类">
          {CATEGORY_OPTIONS.map((o) => (
            <ChoiceChip
              key={o.id}
              active={form.category === o.id}
              onPress={() => setForm((c) => ({ ...c, category: o.id }))}
              label={o.label}
            />
          ))}
        </FieldGroup>

        {/* Color */}
        <View style={{ backgroundColor: T.card, borderRadius: 14, padding: 14, marginBottom: 12, ...T.shadowSm }}>
          <Text style={{ fontSize: 11, color: T.ink3, marginBottom: 6 }}>主色</Text>
          <TextInput
            value={form.color}
            onChangeText={(color) => setForm((c) => ({ ...c, color }))}
            placeholder="例如：白色、米白、黑"
            placeholderTextColor={T.ink4}
            style={{ fontSize: 15, color: T.ink }}
          />
        </View>

        {/* Fit */}
        <FieldGroup label="版型">
          {FIT_OPTIONS.map((o) => (
            <ChoiceChip
              key={o.id}
              active={selectedFit === o.id}
              onPress={() => setSelectedFit(o.id)}
              label={o.label}
            />
          ))}
        </FieldGroup>

        {/* Info note */}
        <View style={{ marginTop: 14, padding: 12, backgroundColor: T.cardSoft, borderRadius: 12 }}>
          <Text style={{ fontSize: 12, color: T.ink2, lineHeight: 19 }}>
            这件会进入「主衣柜」，状态「可穿」。{'\n'}
            可在衣物详情里随时调整位置、状态、合身度。
          </Text>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 36,
          backgroundColor: T.bg,
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <Pressable
          onPress={() => navigation.popToTop()}
          style={{
            flex: 1,
            height: 50,
            borderRadius: 14,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: T.divider,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '500', color: T.ink2 }}>不是这件，重拍</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => ({
            flex: 2,
            height: 50,
            borderRadius: 14,
            backgroundColor: T.ink,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: saving || pressed ? 0.75 : 1,
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>保存到衣橱</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 11, color: colors.tertiaryLabel, marginBottom: 8, paddingHorizontal: 4, letterSpacing: 0.4 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{children}</View>
    </View>
  );
}

function ChoiceChip({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: active ? colors.label : 'transparent',
        borderWidth: 1,
        borderColor: active ? colors.label : colors.separator,
      }}
    >
      <Text style={{ fontSize: 12, color: active ? colors.inverse : colors.secondaryLabel }}>{label}</Text>
    </Pressable>
  );
}
