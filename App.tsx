import './global.css';

import { useState } from 'react';
import { installV3Analytics } from '@/utils/v3AnalyticsRuntime';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AvatarCandidatePromptHost } from '@/components/avatar/AvatarCandidatePromptHost';
import { ToastHost } from '@/components/feedback/ToastHost';
import { RootNavigator } from '@/core/navigation/RootNavigator';
import { QueryProvider } from '@/core/providers/QueryProvider';
import { LandingPage } from '@/screens/landing/LandingPage';

installV3Analytics();

export default function App() {
  const [showApp, setShowApp] = useState(Platform.OS !== 'web');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <StatusBar style="auto" />
          {showApp ? <RootNavigator /> : <LandingPage onEnterApp={() => setShowApp(true)} />}
          <ToastHost />
          {/* V3-014 — renders nothing until a completed source flow arms it and
              a candidate is actually found; a no-op entirely while
              ENABLE_V3_AVATAR is off. Mounted here, beside ToastHost, because
              the import batch's last screen navigates away on success. */}
          <AvatarCandidatePromptHost />
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
