import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { getOutfitCalendar, markPlanWorn } from '@/api/outfitPlan';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { PrimaryButton } from '@/components/forms/PrimaryButton';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useTrack } from '@/hooks/useTrack';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { CalendarCell, CalendarDay } from '@/types/api';
import type { TodayStackParamList } from '@/types/navigation';
import { buildMonthGrid, formatAgendaDate, monthRange, toISODate, todayISO } from '@/utils/date';

type Props = NativeStackScreenProps<TodayStackParamList, 'OutfitCalendar'>;

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  ink4: colors.quaternaryLabel,
  accent: colors.accent,
  divider: colors.separator,
};

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function statusCode(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

// --- Month grid ------------------------------------------------------------

function DayMarker({ worn, planned }: { worn: boolean; planned: boolean }) {
  // worn → filled dot; planned → ring. Both can show.
  return (
    <View style={{ flexDirection: 'row', gap: 3, height: 6, marginTop: 3 }}>
      {worn ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: T.accent }} /> : null}
      {planned ? (
        <View
          style={{ width: 5, height: 5, borderRadius: 3, borderWidth: 1.4, borderColor: T.accent }}
        />
      ) : null}
    </View>
  );
}

function MonthGrid({
  year,
  month,
  cellsByDate,
  selected,
  today,
  onSelect,
}: {
  year: number;
  month: number;
  cellsByDate: Map<string, CalendarCell[]>;
  selected: string;
  today: string;
  onSelect: (iso: string) => void;
}) {
  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);
  return (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {WEEKDAYS.map((w) => (
          <Text
            key={w}
            style={{ flex: 1, textAlign: 'center', ...type.caption, color: T.ink4 }}
          >
            {w}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((iso, di) => {
            if (!iso) return <View key={di} style={{ flex: 1, aspectRatio: 1 }} />;
            const cells = cellsByDate.get(iso) ?? [];
            const worn = cells.some((c) => c.kind === 'worn');
            const planned = cells.some((c) => c.kind === 'planned');
            const isToday = iso === today;
            const isSelected = iso === selected;
            const dayNum = Number(iso.slice(8, 10));
            return (
              <Pressable
                key={di}
                onPress={() => onSelect(iso)}
                style={{ flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isToday ? T.ink : isSelected ? colors.accentSoft : 'transparent',
                    borderWidth: isSelected && !isToday ? 1.5 : 0,
                    borderColor: T.accent,
                  }}
                >
                  <Text
                    style={{
                      ...type.callout,
                      fontWeight: isToday || isSelected ? '700' : '500',
                      color: isToday ? colors.inverse : T.ink2,
                    }}
                  >
                    {dayNum}
                  </Text>
                </View>
                <DayMarker worn={worn} planned={planned} />
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: T.accent }} />
          <Text style={{ ...type.caption, color: T.ink3 }}>已穿</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, borderWidth: 1.4, borderColor: T.accent }} />
          <Text style={{ ...type.caption, color: T.ink3 }}>已计划</Text>
        </View>
      </View>
    </View>
  );
}

// --- Day agenda ------------------------------------------------------------

function Thumb({ uri }: { uri: string | null }) {
  return (
    <View
      style={{
        width: 56,
        height: 56,
        borderRadius: radius.sm,
        backgroundColor: T.cardSoft,
        overflow: 'hidden',
      }}
    >
      {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
    </View>
  );
}

function WornCell({ cell, onDetail }: { cell: CalendarCell; onDetail: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: T.card,
        borderRadius: radius.lg,
        padding: 12,
        ...shadow.soft,
      }}
    >
      <Thumb uri={cell.ootdImageUrl} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...type.headline, color: T.ink }} numberOfLines={1}>
          {cell.outfit?.title ?? '已穿搭配'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: T.accent }} />
          <Text style={{ ...type.caption, color: T.ink3 }}>已穿</Text>
        </View>
      </View>
      {cell.outfit ? (
        <Pressable onPress={onDetail} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ ...type.footnote, color: T.ink3 }}>详情</Text>
          <SystemIcon name="chevronRight" size={14} color={T.ink3} />
        </Pressable>
      ) : null}
    </View>
  );
}

function PlannedCell({
  cell,
  onWear,
  wearing,
}: {
  cell: CalendarCell;
  onWear: () => void;
  wearing: boolean;
}) {
  return (
    <View style={{ backgroundColor: T.card, borderRadius: radius.lg, padding: 12, ...shadow.soft }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Thumb uri={cell.ootdImageUrl} />
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.headline, color: T.ink }} numberOfLines={1}>
            {cell.outfit?.title ?? '已计划搭配'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, borderWidth: 1.4, borderColor: T.accent }} />
            <Text style={{ ...type.caption, color: T.ink3 }}>已计划</Text>
          </View>
        </View>
      </View>
      <View style={{ marginTop: 12 }}>
        <PrimaryButton label="标记已穿" onPress={onWear} loading={wearing} />
      </View>
    </View>
  );
}

function EmptyDay({ onPlan }: { onPlan: () => void }) {
  return (
    <Pressable
      onPress={onPlan}
      style={{
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: T.divider,
        borderStyle: 'dashed',
        paddingVertical: 22,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <SystemIcon name="sparkle" size={20} color={T.accent} strokeWidth={1.9} />
      <Text style={{ ...type.callout, color: T.ink2 }}>＋ 为这天计划穿搭</Text>
    </Pressable>
  );
}

// --- Screen ----------------------------------------------------------------

export function OutfitCalendarScreen({ navigation }: Props) {
  const today = todayISO();
  const track = useTrack();
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const initial = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  }, []);
  const [cursor, setCursor] = useState(initial);
  const [selected, setSelected] = useState(today);

  const { start, end } = useMemo(() => monthRange(cursor.year, cursor.month), [cursor]);

  useEffect(() => {
    track('calendar_viewed', { month: `${cursor.year}-${cursor.month + 1}` });
  }, [cursor, track]);

  const calendarQuery = useQuery({
    queryKey: ['outfitCalendar', start, end],
    queryFn: () => getOutfitCalendar(start, end),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const wearMutation = useMutation({
    mutationFn: (outfitPlanId: string) => markPlanWorn(outfitPlanId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outfitCalendar'] });
      showToast({ message: '已标记为已穿', kind: 'success' });
      track('outfit_plan_worn_marked', {});
    },
  });

  const cellsByDate = useMemo(() => {
    const map = new Map<string, CalendarCell[]>();
    for (const day of (calendarQuery.data ?? []) as CalendarDay[]) {
      map.set(day.date, day.cells);
    }
    return map;
  }, [calendarQuery.data]);

  const shiftMonth = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    setCursor({ year, month });
    // Keep the selected day inside the visible month: snap to today if it
    // lands in the new month, otherwise to the 1st.
    const td = new Date();
    setSelected(
      td.getFullYear() === year && td.getMonth() === month
        ? todayISO()
        : toISODate(new Date(year, month, 1)),
    );
  };

  const selectedCells = cellsByDate.get(selected) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 52,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: T.card,
            alignItems: 'center',
            justifyContent: 'center',
            ...shadow.soft,
          }}
        >
          <SystemIcon name="chevronLeft" size={18} color={T.ink} />
        </Pressable>
        <Text style={{ ...type.title2, color: T.ink }}>穿搭日历</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Month card */}
        <View
          style={{
            backgroundColor: T.card,
            borderRadius: radius.xl,
            padding: 16,
            marginTop: 8,
            ...shadow.soft,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} style={{ padding: 4 }}>
              <SystemIcon name="chevronLeft" size={18} color={T.ink2} />
            </Pressable>
            <Text style={{ ...type.headline, color: T.ink }}>
              {cursor.year} 年 {cursor.month + 1} 月
            </Text>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={8} style={{ padding: 4 }}>
              <SystemIcon name="chevronRight" size={18} color={T.ink2} />
            </Pressable>
          </View>
          <MonthGrid
            year={cursor.year}
            month={cursor.month}
            cellsByDate={cellsByDate}
            selected={selected}
            today={today}
            onSelect={setSelected}
          />
        </View>

        {/* Agenda */}
        <Text style={{ ...type.headline, color: T.ink, marginTop: 24, marginBottom: 12 }}>
          {formatAgendaDate(selected)}
        </Text>

        {calendarQuery.isLoading ? (
          <LoadingBlock label="加载中…" />
        ) : calendarQuery.isError ? (
          statusCode(calendarQuery.error) === 503 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center', paddingHorizontal: 16 }}>
              <Text style={{ ...type.headline, color: T.ink, textAlign: 'center' }}>
                穿搭日历尚未开放
              </Text>
              <Text style={{ ...type.callout, color: T.ink3, textAlign: 'center', marginTop: 8 }}>
                该功能正在准备中，稍后回来试试。
              </Text>
            </View>
          ) : (
            <ErrorState onRetry={() => calendarQuery.refetch()} />
          )
        ) : selectedCells.length === 0 ? (
          <EmptyDay onPlan={() => navigation.navigate('OutfitPlanPicker', { plannedDate: selected })} />
        ) : (
          <View style={{ gap: 12 }}>
            {selectedCells.map((cell, i) =>
              cell.kind === 'planned' ? (
                <PlannedCell
                  key={cell.outfitPlanId ?? i}
                  cell={cell}
                  wearing={wearMutation.isPending}
                  onWear={() => cell.outfitPlanId && wearMutation.mutate(cell.outfitPlanId)}
                />
              ) : (
                <WornCell
                  key={cell.wearHistoryId ?? i}
                  cell={cell}
                  onDetail={() =>
                    cell.outfit &&
                    navigation.navigate('OutfitDetail', { outfitId: cell.outfit.outfitId })
                  }
                />
              ),
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
