import { AmapCoords } from './AmapLocation.types';

// Non-Android fallback (web / iOS). Amap location is Android-only for now; Metro
// resolves AmapLocationModule.android.ts on Android and this stub elsewhere.
export default {
  async getCurrentPosition(): Promise<AmapCoords> {
    throw new Error('AmapLocation is only available on Android');
  },
};
