# 高德定位接入方案（Android，中国环境）

## 背景 / 根因
expo-location 在 Android 上用 Google `FusedLocationProviderClient`，其网络辅助定位要连 Google 后端（GLS）。中国网络下 GMS 连不上 Google（logcat 实证：`GlsClientGrpc` 网络失败、连 `googleapis.com` 30s 超时），导致定位请求挂起 → 超时。纯 GPS 卫星（系统原生 LocationManager）室外可用、室内不行。

结论：中国可靠定位需用国内 SDK（高德），它走国内可达后端做 wifi/基站定位，室内外都行。

现成 RN 库 `react-native-amap-geolocation`（1.2.3，2023 停更）不兼容本项目 RN 0.85 + 新架构（newArchEnabled=true）→ 自写本地 Expo Module。

## 范围
- 仅 Android（本次）。iOS 以后另做（需另注册 iOS Key）。
- 手动输入城市始终保留为兜底，不动。

## 实现步骤
1. `npx create-expo-module --local modules/amap-location` 建本地原生模块（新架构兼容）。
2. 模块 Android 端：
   - 依赖高德定位 SDK：`com.amap.api:location:6.4.9`（或当前稳定版）。
   - PIPL 合规：定位前必须调 `AMapLocationClient.updatePrivacyShow(ctx,true,true)` + `updatePrivacyAgree(ctx,true)`，否则 SDK 拒绝定位。
   - 暴露 JS API：`getCurrentPosition(): Promise<{ longitude, latitude }>`，单次定位（`setOnceLocation(true)`，高精度模式），带超时。
3. **config plugin**（`modules/amap-location/plugin`）：把高德 Key 注入 `AndroidManifest`：
   `<meta-data android:name="com.amap.api.v2.apikey" android:value="<KEY>"/>`
   - Key 从 app.config extra / 环境变量读，不硬编码（参考现有 `API_BASE_URL` 的注入方式）。
4. `utils/location.ts` 的 `getCurrentCoords()`（PR #28 引入）：Android 优先走高德模块，失败/非 Android 回退 expo-location。
5. 坐标系：高德返回 **GCJ-02**，QWeather 中国接口也用 GCJ-02 → 直接对得上，无需转换（落地时验证后端 `weather` 链路）。

## 需要用户提供
- **高德 Android Key**：[高德开放平台](https://lbs.amap.com) 创建 Android Key，绑定：
  - 包名：`app.aidrobe.android`
  - 发布版 SHA1（当前 debug keystore）：`5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
  - ⚠️ 正式上架换正式 keystore 后，用其 SHA1 重新绑定一个 Key。

## 测试
- 真机 V2436A（已可 ADB 连），`assembleRelease` 装机验证室内能否定位。

## 依赖 / 顺序
- 逻辑上接在 PR #28（`getCurrentCoords` 定位改造）之上：等 #28 合并 → 基于更新后的 main 再实现，避免依赖型并行 PR。
- 阻塞项：高德 Key（无 Key 无法联调/测试）。
