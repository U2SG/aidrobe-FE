import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AddItemScreen } from '@/screens/wardrobe/AddItemScreen';
import { ImportConfirmScreen } from '@/screens/wardrobe/ImportConfirmScreen';
import { ImportFailureScreen } from '@/screens/wardrobe/ImportFailureScreen';
import { ItemDetailScreen } from '@/screens/wardrobe/ItemDetailScreen';
import { WardrobeListScreen } from '@/screens/wardrobe/WardrobeListScreen';
import type { WardrobeStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<WardrobeStackParamList>();

export function WardrobeNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#f7f3ec' },
        headerShadowVisible: false,
        headerTintColor: '#1c1c1a',
      }}
    >
      <Stack.Screen
        name="WardrobeList"
        component={WardrobeListScreen}
        options={{ title: '衣橱' }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{ title: '衣物详情' }}
      />
      <Stack.Screen name="AddItem" component={AddItemScreen} options={{ title: '添加衣物' }} />
      <Stack.Screen
        name="ImportConfirm"
        component={ImportConfirmScreen}
        options={{ title: '确认导入' }}
      />
      <Stack.Screen
        name="ImportFailure"
        component={ImportFailureScreen}
        options={{ title: '导入失败', headerBackVisible: false }}
      />
    </Stack.Navigator>
  );
}
