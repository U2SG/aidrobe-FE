import type { ImageSourcePropType } from 'react-native';

import bagCreamTote from '@/assets/wardrobe/bag-cream-tote.png';
import bottomIndigoJeans from '@/assets/wardrobe/bottom-indigo-jeans.png';
import bottomIvoryTrousers from '@/assets/wardrobe/bottom-ivory-trousers.png';
import shoesWhiteCanvas from '@/assets/wardrobe/shoes-white-canvas.png';
import topCreamShirt from '@/assets/wardrobe/top-cream-shirt.png';
import topOatKnit from '@/assets/wardrobe/top-oat-knit.png';
import type { ItemCategory } from '@/types/api';

export type ShowcaseGroup = 'tops' | 'bottoms' | 'accessories';

export interface ShowcaseItem {
  id: string;
  name: string;
  category: ItemCategory;
  color: string;
  tone: string;
  image: ImageSourcePropType;
}

export const SHOWCASE_ITEMS: Record<ShowcaseGroup, ShowcaseItem[]> = {
  tops: [
    {
      id: 'top-cream-shirt',
      name: '米白棉衬衫',
      category: 'top',
      color: '米白',
      tone: '干净 / 稳妥',
      image: topCreamShirt as ImageSourcePropType,
    },
    {
      id: 'top-oat-knit',
      name: '燕麦色短袖针织',
      category: 'top',
      color: '燕麦',
      tone: '柔和 / 轻松',
      image: topOatKnit as ImageSourcePropType,
    },
  ],
  bottoms: [
    {
      id: 'bottom-indigo-jeans',
      name: '深靛牛仔直筒裤',
      category: 'bottom',
      color: '深靛',
      tone: '利落 / 日常',
      image: bottomIndigoJeans as ImageSourcePropType,
    },
    {
      id: 'bottom-ivory-trousers',
      name: '米色西装裤',
      category: 'bottom',
      color: '米色',
      tone: '轻商务 / 松弛',
      image: bottomIvoryTrousers as ImageSourcePropType,
    },
  ],
  accessories: [
    {
      id: 'shoes-white-canvas',
      name: '白色帆布鞋',
      category: 'shoes',
      color: '白色',
      tone: '舒适 / 清爽',
      image: shoesWhiteCanvas as ImageSourcePropType,
    },
    {
      id: 'bag-cream-tote',
      name: '米白托特包',
      category: 'accessory',
      color: '米白',
      tone: '通勤 / 温柔',
      image: bagCreamTote as ImageSourcePropType,
    },
  ],
};

export const SHOWCASE_WARDROBE = [
  ...SHOWCASE_ITEMS.tops,
  ...SHOWCASE_ITEMS.bottoms,
  ...SHOWCASE_ITEMS.accessories,
];
