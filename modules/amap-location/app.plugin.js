const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

// Injects the Amap API key into AndroidManifest as the meta-data the SDK reads
// (com.amap.api.v2.apikey). The key comes from the AMAP_API_KEY env var (loaded
// from .env.* at prebuild time) so it is never committed. No key → no-op, and
// Amap location simply stays unavailable.
module.exports = function withAmapLocation(config) {
  return withAndroidManifest(config, (cfg) => {
    const key = process.env.AMAP_API_KEY;
    if (!key) {
      console.warn('[amap-location] AMAP_API_KEY not set — skipping apikey meta-data');
      return cfg;
    }
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      app,
      'com.amap.api.v2.apikey',
      key,
    );
    return cfg;
  });
};
