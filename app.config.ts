import { ConfigContext, ExpoConfig } from 'expo/config';
import { AndroidConfig, ConfigPlugin, withAndroidManifest } from '@expo/config-plugins';

const APP_ENV = (process.env.APP_ENV ?? 'development') as
  | 'development'
  | 'staging'
  | 'production';

const API_BASE_URL =
  process.env.API_BASE_URL ??
  (APP_ENV === 'production'
    ? 'https://api.aidrobe.app'
    : APP_ENV === 'staging'
      ? 'https://api.staging.aidrobe.app'
      : 'http://localhost:8000');

const DEV_USER_ID =
  process.env.DEV_USER_ID ?? '00000000-0000-4000-8000-000000000001';

// MVP V2 redesign shell master switch. Off by default so the existing UI keeps
// running; flip to 'true' to opt this build into the V2 IA / Today experience.
// Single coarse flag — this is a system-level experience rewrite, not a per-
// feature rollout, so no gradual gating (see redesign brief v0.9 §3.3).
const ENABLE_MVP_V2_UI = (process.env.ENABLE_MVP_V2_UI ?? 'false') === 'true';

// V3 Should-I-Buy decision flow (v3-p0-contract §2). Off by default — the BE
// gate ENABLE_V3_PURCHASE_DECISION also defaults off and answers 503, so this
// build flag only controls whether the entry point renders at all; enabling it
// in production is a human gate.
const ENABLE_V3_PURCHASE_DECISION = (process.env.ENABLE_V3_PURCHASE_DECISION ?? 'false') === 'true';

const androidConfig: NonNullable<ExpoConfig['android']> & {
  usesCleartextTraffic?: boolean;
} = {
  package: 'app.aidrobe.android',
  versionCode: 6,
  usesCleartextTraffic: APP_ENV !== 'production',
  // 衣然 YIRAN adaptive launcher icon: the primary mark on the warm-white brand
  // background (docs/design/brand/logo/final-v1).
  adaptiveIcon: {
    foregroundImage: './assets/adaptive-icon.png',
    backgroundColor: '#FAF7F0',
  },
};

const withAndroidCleartextTraffic: ConfigPlugin = (config) =>
  withAndroidManifest(config, (pluginConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      pluginConfig.modResults,
    );
    if (APP_ENV === 'production') {
      delete application.$['android:usesCleartextTraffic'];
    } else {
      application.$['android:usesCleartextTraffic'] = 'true';
    }
    return pluginConfig;
  });

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Aidrobe',
  slug: 'aidrobe',
  owner: 'gt1o',
  scheme: 'aidrobe',
  version: '0.1.0',
  platforms: ['ios', 'android', 'web'],
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  // 衣然 YIRAN brand icon + splash (docs/design/brand/logo/final-v1). Warm-white
  // brand background #FAF7F0 to match the app's morning surface.
  icon: './assets/icon.png',
  // Spread-cast: expo honors a top-level `splash` at build time, but SDK 56
  // dropped it from the ExpoConfig type (it moved to the expo-splash-screen
  // plugin, which is not installed here). Spreading bypasses the excess-property
  // check while keeping the branded launch screen.
  ...({
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#FAF7F0',
    },
  } as unknown as Partial<ExpoConfig>),
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'app.aidrobe.ios',
    buildNumber: '1',
    usesAppleSignIn: true,
    infoPlist: {
      NSCameraUsageDescription:
        'Aidrobe needs camera access to photograph wardrobe items.',
      NSPhotoLibraryUsageDescription:
        'Aidrobe needs photo library access to select wardrobe item photos.',
      NSPhotoLibraryAddUsageDescription:
        'Aidrobe needs photo library access to save captured wardrobe item photos.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: androidConfig,
  plugins: [
    withAndroidCleartextTraffic,
    'expo-dev-client',
    'expo-secure-store',
    'expo-status-bar',
    [
      'expo-camera',
      {
        cameraPermission:
          'Allow Aidrobe to use the camera to photograph wardrobe items.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Allow Aidrobe to access photos to select wardrobe item images.',
        cameraPermission:
          'Allow Aidrobe to use the camera to photograph wardrobe items.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Allow Aidrobe to use your location to fetch local weather for outfit recommendations.',
      },
    ],
    // Injects the Amap (高德) API key into AndroidManifest from AMAP_API_KEY.
    './modules/amap-location/app.plugin.js',
  ] as ExpoConfig['plugins'],
  extra: {
    APP_ENV,
    API_BASE_URL,
    DEV_USER_ID,
    ENABLE_MVP_V2_UI,
    ENABLE_V3_PURCHASE_DECISION,
    eas: {
      projectId: '8c50e01b-2844-473e-adec-3668fc2c2e9c',
    },
  },
});
