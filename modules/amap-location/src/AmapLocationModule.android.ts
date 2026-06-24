import { NativeModule, requireNativeModule } from 'expo';

import { AmapCoords } from './AmapLocation.types';

declare class AmapLocationModule extends NativeModule<{}> {
  getCurrentPosition(): Promise<AmapCoords>;
}

export default requireNativeModule<AmapLocationModule>('AmapLocation');
