import './global.css';

import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/feedback/ToastHost';
import { RootNavigator } from '@/core/navigation/RootNavigator';
import { QueryProvider } from '@/core/providers/QueryProvider';
import { LandingPage } from '@/screens/landing/LandingPage';

export default function App() {
  const [showApp, setShowApp] = useState(Platform.OS !== 'web');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <StatusBar style="auto" />
          {showApp ? <RootNavigator /> : <LandingPage onEnterApp={() => setShowApp(true)} />}
          <ToastHost />
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
