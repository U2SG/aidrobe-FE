import { ConfigContext, ExpoConfig } from 'expo/config';

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

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Aidrobe',
  slug: 'aidrobe',
  scheme: 'aidrobe',
  version: '0.1.0',
  platforms: ['ios', 'android', 'web'],
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
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
  android: {
    package: 'app.aidrobe.android',
    versionCode: 1,
  },
  plugins: [
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
  ],
  extra: {
    APP_ENV,
    API_BASE_URL,
    DEV_USER_ID,
  },
});
