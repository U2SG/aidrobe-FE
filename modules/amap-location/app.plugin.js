const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

// Injects the Amap API key into AndroidManifest as the meta-data the SDK reads
// (com.amap.api.v2.apikey). The key comes from the AMAP_API_KEY env var (loaded
// from .env.* at prebuild time) so it is never committed. No key → no-op, and
// Legacy profiles keep that fallback; cloud V3 preview builds fail closed.
module.exports = function withAmapLocation(config) {
  return withAndroidManifest(config, (cfg) => {
    const key = process.env.AMAP_API_KEY?.trim();
    if (!key) {
      if (process.env.EAS_BUILD === 'true' && process.env.AIDROBE_BUILD_VARIANT === 'v3-preview') {
        throw new Error('V3 preview requires AMAP_API_KEY in the EAS preview environment. No key value is logged.');
      }
      console.warn('[amap-location] AMAP_API_KEY not set — skipping apikey meta-data');
      return cfg;
    }
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      app,
      'com.amap.api.v2.apikey',
      key,
    );
    if (process.env.EAS_BUILD === 'true') {
      console.log('[amap-location] API key metadata configured (value redacted)');
    }
    return cfg;
  });
};
