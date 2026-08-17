import * as ImagePicker from 'expo-image-picker';

// V3-015 — the one place a full-body photo enters the app from the device.
//
// It exists as a port rather than an inline `ImagePicker` call for two reasons,
// and only the first is about testing:
//
// 1. **Denial and cancellation are RESULTS here, not exceptions.** Both are
//    ordinary things a user does, and V3-015 acceptance 3 requires both to be
//    recoverable. The wardrobe screens' inline pattern
//    (`AddWardrobeScreen.pickFromCamera`) toasts the denial and silently drops
//    the cancel, which is right for an optional add and wrong for a flow whose
//    whole subject is the photo: a returned value forces the caller to decide
//    what the user sees.
// 2. **The device picker is not observable from a browser.** react-native-web's
//    `requestCameraPermissionsAsync` returns `granted` unconditionally
//    (`expo-image-picker/src/ExponentImagePicker.web.ts`), so a denial cannot be
//    produced from the evidence driver at all. The seam below lets the driver
//    install a deterministic picker for that one state; everything else is
//    driven through the real path.
//
// Nothing here uploads. The photo is a local URI until the caller decides to
// send it, which is what lets the screen state its purpose first (acceptance 4).

export type AvatarPhotoSource = 'album' | 'camera';

export type PersonPhotoPick =
  | { kind: 'picked'; uri: string }
  | { kind: 'cancelled' }
  | { kind: 'permission_denied' };

export type PersonPhotoPicker = (source: AvatarPhotoSource) => Promise<PersonPhotoPick>;

const devicePicker: PersonPhotoPicker = async (source) => {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { kind: 'permission_denied' };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });
  // `canceled` and "no asset" are the same thing to the caller: nothing was
  // chosen, so nothing happened.
  const asset = result.canceled ? null : result.assets[0];
  return asset ? { kind: 'picked', uri: asset.uri } : { kind: 'cancelled' };
};

let picker: PersonPhotoPicker = devicePicker;

/**
 * Replace the device picker — `__DEV__` builds only.
 *
 * Same shape as the existing `setAnalyticsDispatcher` seam, with one extra
 * bound: a production bundle ignores this call, so no release build can be made
 * to read a photo from anywhere but the device picker. Passing `null` restores
 * the device implementation.
 */
export function setPersonPhotoPicker(next: PersonPhotoPicker | null): void {
  if (!__DEV__) return;
  picker = next ?? devicePicker;
}

export function pickPersonPhoto(source: AvatarPhotoSource): Promise<PersonPhotoPick> {
  return picker(source);
}

// The evidence driver runs against a dev bundle in a browser and has no module
// graph to reach into, so the dev-only seam is published on `globalThis` for it.
// Guarded twice — here and inside the setter — so this is absent from a
// production bundle rather than merely unused in one.
if (__DEV__) {
  (globalThis as { __aidrobeSetPersonPhotoPicker?: typeof setPersonPhotoPicker }).__aidrobeSetPersonPhotoPicker =
    setPersonPhotoPicker;
}
