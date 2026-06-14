import { Pressable, ScrollView, Text, View } from 'react-native';

import { GarmentSvg } from '@/components/ui/GarmentSvg';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { colors, radius, shadow, type } from '@/theme/design';

interface Props {
  onEnterApp: () => void;
}

const previews = [
  {
    title: '今日推荐',
    caption: '最稳妥 / 最省时 / 更有风格',
    metric: '38 分钟',
  },
  {
    title: '真实衣橱',
    caption: '只推荐找得到、能穿、来得及拿的衣服',
    metric: '1 件可穿',
  },
  {
    title: '拍照添加',
    caption: '相机、相册、商品链接都能进入衣橱',
    metric: '92% 把握',
  },
];

const proofPoints = [
  ['时间敏感', '根据距离出门还有多久，调整方案的稳妥度和准备成本。'],
  ['现实可执行', '考虑衣物位置、是否待洗、是否需要熨烫，而不是只做风格拼图。'],
  ['隐私克制', '不申请推送、定位或通讯录；衣物照片只用于识别与推荐。'],
];

export function LandingPage({ onEnterApp }: Props) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 56 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: 24, paddingTop: 26, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={{
              fontSize: 12,
              fontFamily: 'monospace',
              letterSpacing: 1.5,
              color: colors.accent,
              fontWeight: '700',
            }}
          >
            AIDROBE
          </Text>
          <Pressable onPress={onEnterApp} hitSlop={12}>
            <Text style={{ ...type.footnote, color: colors.secondaryLabel, fontWeight: '600' }}>
              进入 App
            </Text>
          </Pressable>
        </View>

        <View style={{ paddingTop: 38 }}>
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: radius.pill,
              backgroundColor: colors.accentSoft,
            }}
          >
            <Text style={{ ...type.caption, color: colors.accent, fontWeight: '700' }}>
              内测中 · AI Wardrobe Decision
            </Text>
          </View>

          <Text
            style={{
              marginTop: 18,
              fontSize: 46,
              lineHeight: 52,
              letterSpacing: -0.8,
              color: colors.label,
              fontWeight: '700',
            }}
          >
            不是更多衣服，{'\n'}而是每天{'\n'}更快穿对。
          </Text>
          <Text style={{ marginTop: 18, ...type.body, color: colors.secondaryLabel, lineHeight: 24 }}>
            Aidrobe 基于你真实拥有、现在能穿、找得到、来得及拿的衣服，在每天早上给出 3 套可执行穿搭决策。
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
            <Pressable
              onPress={onEnterApp}
              android_ripple={{ color: 'rgba(255,255,255,0.14)' }}
              style={{
                flex: 1,
                minHeight: 52,
                borderRadius: radius.md,
                backgroundColor: colors.label,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ ...type.body, color: colors.inverse, fontWeight: '700' }}>加入 TestFlight</Text>
            </Pressable>
            <Pressable
              onPress={onEnterApp}
              android_ripple={{ color: colors.fill }}
              style={{
                flex: 1,
                minHeight: 52,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.separator,
                backgroundColor: colors.elevated,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ ...type.body, color: colors.label, fontWeight: '700' }}>查看产品说明</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={{ height: 330, marginTop: 10, marginHorizontal: 16 }}>
        <View
          style={{
            position: 'absolute',
            left: 8,
            right: 8,
            top: 28,
            bottom: 0,
            borderRadius: 34,
            backgroundColor: colors.elevated,
            ...shadow.elevated,
          }}
        />
        <View style={{ position: 'absolute', left: 36, top: 48 }}>
          <GarmentSvg kind="blazer" size={126} />
        </View>
        <View style={{ position: 'absolute', right: 38, top: 78, transform: [{ rotate: '5deg' }] }}>
          <GarmentSvg kind="shirt" size={112} />
        </View>
        <View style={{ position: 'absolute', left: 116, top: 168 }}>
          <GarmentSvg kind="trousers" size={112} />
        </View>
        <View style={{ position: 'absolute', right: 56, bottom: 34, transform: [{ rotate: '-8deg' }] }}>
          <GarmentSvg kind="loafer" size={88} />
        </View>
        <View
          style={{
            position: 'absolute',
            left: 28,
            bottom: 28,
            right: 28,
            padding: 14,
            borderRadius: radius.lg,
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderWidth: 1,
            borderColor: colors.separatorSoft,
          }}
        >
          <Text style={{ ...type.caption, color: colors.accent, fontWeight: '700', letterSpacing: 0.7 }}>
            08:30 出门 · 还剩 38 分钟
          </Text>
          <Text style={{ marginTop: 4, ...type.headline, color: colors.label }}>
            通勤 · 黑白经典
          </Text>
          <Text style={{ marginTop: 4, ...type.footnote, color: colors.tertiaryLabel }}>
            主衣柜可取 · 无需熨烫 · 8 分钟准备
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 28, gap: 12 }}>
        {previews.map((item, index) => (
          <View
            key={item.title}
            style={{
              borderRadius: radius.xl,
              backgroundColor: colors.elevated,
              padding: 18,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              ...shadow.soft,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.md,
                backgroundColor: index === 0 ? colors.accentSoft : colors.secondaryElevated,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SystemIcon
                name={index === 0 ? 'sparkle' : index === 1 ? 'wardrobe' : 'camera'}
                size={22}
                color={index === 0 ? colors.accent : colors.secondaryLabel}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ ...type.headline, color: colors.label }}>{item.title}</Text>
              <Text style={{ marginTop: 3, ...type.footnote, color: colors.tertiaryLabel }}>
                {item.caption}
              </Text>
            </View>
            <Text style={{ ...type.caption, color: colors.accent, fontWeight: '700' }}>{item.metric}</Text>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 36 }}>
        <Text style={{ ...type.title2, color: colors.label }}>为什么不是普通穿搭 App</Text>
        <View style={{ marginTop: 16, gap: 14 }}>
          {proofPoints.map(([title, body]) => (
            <View key={title} style={{ gap: 4 }}>
              <Text style={{ ...type.headline, color: colors.label }}>{title}</Text>
              <Text style={{ ...type.footnote, color: colors.tertiaryLabel, lineHeight: 19 }}>{body}</Text>
            </View>
          ))}
        </View>
      </View>

      <View
        style={{
          marginHorizontal: 20,
          marginTop: 36,
          padding: 18,
          borderRadius: radius.xl,
          backgroundColor: colors.secondaryElevated,
          borderWidth: 1,
          borderColor: colors.separatorSoft,
        }}
      >
        <Text style={{ ...type.headline, color: colors.label }}>内测说明</Text>
        <Text style={{ marginTop: 8, ...type.footnote, color: colors.secondaryLabel, lineHeight: 20 }}>
          当前版本优先验证一个问题：你是否愿意每天早晨打开 Aidrobe，并采纳它给出的可执行推荐。
        </Text>
      </View>
    </ScrollView>
  );
}
