import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AddItemScreen } from '@/screens/wardrobe/AddItemScreen';
import { ImportConfirmScreen } from '@/screens/wardrobe/ImportConfirmScreen';
import { ImportFailureScreen } from '@/screens/wardrobe/ImportFailureScreen';
import { ItemDetailScreen } from '@/screens/wardrobe/ItemDetailScreen';
import { WardrobeListScreen } from '@/screens/wardrobe/WardrobeListScreen';
import { colors } from '@/theme/design';
import type { WardrobeStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<WardrobeStackParamList>();

export function WardrobeNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.groupedBackground },
        headerShadowVisible: false,
        headerTintColor: colors.label,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="WardrobeList"
        component={WardrobeListScreen}
        options={{ title: '衣橱', headerShown: false }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{ title: '衣物详情', headerShown: false }}
      />
      <Stack.Screen
        name="AddItem"
        component={AddItemScreen}
        options={{ title: '添加衣物', headerShown: false }}
      />
      <Stack.Screen
        name="ImportConfirm"
        component={ImportConfirmScreen}
        options={{ title: '确认导入' }}
      />
      <Stack.Screen
        name="ImportFailure"
        component={ImportFailureScreen}
        options={{ title: '导入失败', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
