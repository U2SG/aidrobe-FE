import { Pressable, Text, View } from 'react-native';

import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { colors, radius, type } from '@/theme/design';
import type { CoreSlot } from '@/screens/onboarding-v2/firstOutfit';

const SLOT_LABEL: Record<CoreSlot, I18nKey> = {
  top: 'firstOutfit.slot.top',
  bottom: 'firstOutfit.slot.bottom',
  shoes: 'firstOutfit.slot.shoes',
  dress: 'firstOutfit.slot.dress',
};

// The specific, honest "you're one piece away" state (brief v0.9 §6.3): lists
// the core slots (top / bottom / shoes) as a have/need checklist and points at
// exactly what to add — never a fake outfit.
export function SlotGapEmptyState({
  missingSlots,
  onAddItem,
}: {
  missingSlots: CoreSlot[];
  onAddItem: () => void;
}) {
  const { t } = useT();
  const checklist: CoreSlot[] = ['top', 'bottom', 'shoes'];
  const primaryMissing = missingSlots[0];

  return (
    <View style={{ gap: 20 }}>
      <View
        style={{
          borderRadius: radius.xl,
          backgroundColor: colors.secondaryElevated,
          borderWidth: 1,
          borderColor: colors.separatorSoft,
          padding: 20,
          gap: 16,
        }}
      >
        {checklist.map((slot) => {
          const missing = missingSlots.includes(slot);
          return (
            <View key={slot} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: missing ? colors.fill : colors.accentSoft,
                  borderWidth: missing ? 1 : 0,
                  borderColor: colors.separator,
                  ...(missing ? { borderStyle: 'dashed' as const } : {}),
                }}
              >
                {missing ? null : (
                  <SystemIcon name="check" size={14} color={colors.accent} strokeWidth={2.2} />
                )}
              </View>
              <Text
                style={{
                  ...type.body,
                  color: missing ? colors.cautionAmber : colors.label,
                  fontWeight: missing ? '600' : '400',
                }}
              >
                {t(SLOT_LABEL[slot])}
              </Text>
              <Text style={{ ...type.footnote, color: colors.tertiaryLabel, marginLeft: 'auto' }}>
                {missing ? t('firstOutfit.slot.missing') : t('firstOutfit.slot.have')}
              </Text>
            </View>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onAddItem}
        style={({ pressed }) => ({
          height: 54,
          borderRadius: radius.md,
          backgroundColor: colors.label,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.88 : 1,
        })}
      >
        <Text style={{ ...type.headline, color: colors.inverse }}>
          {primaryMissing
            ? t('firstOutfit.addSpecific', { slot: t(SLOT_LABEL[primaryMissing]) })
            : t('firstOutfit.addGeneric')}
        </Text>
      </Pressable>
    </View>
  );
}
