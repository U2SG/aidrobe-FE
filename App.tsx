import './global.css';

import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { QueryProvider } from '@/core/providers/QueryProvider';
import { RootNavigator } from '@/core/navigation/RootNavigator';
import { ToastHost } from '@/components/feedback/ToastHost';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <StatusBar style="auto" />
          <RootNavigator />
          <ToastHost />
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
