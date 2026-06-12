# Aidrobe V1 Slim — 开发者参考文档与 Checklist

> 本文档基于 `14_iOS前端页面设计与ReactNative技术方案.md` 整理，作为 React Native 端开发同学的快速参考与进度跟踪 checklist。

---

## 0. 项目基本信息

| 项 | 值 |
|---|---|
| 端 | iOS（V1 Slim 仅 iOS） |
| 框架 | React Native + Expo Dev Client |
| 语言 | TypeScript |
| 页面总数 | 12（10 App 页 + 1 弹层 + 1 Web 落地页） |
| 核心验证目标 | 用户是否愿意每天早晨打开 App 并采纳推荐 |
| 不做项 | 推送、定位、链接导入、账号体系、风格问卷等（见 §9） |

---

## 1. 环境准备 Checklist

- [ ] 安装 Node.js LTS（≥ 20）
- [ ] 安装 pnpm 或 yarn
- [ ] 安装 Xcode（最新稳定版）+ iOS 模拟器
- [ ] 安装 Expo CLI：`npm i -g expo-cli`
- [ ] 安装 EAS CLI：`npm i -g eas-cli`
- [ ] 配置 Apple Developer 账号（用于 TestFlight）
- [ ] 配置 EAS Build 凭证
- [ ] 配置后端开发环境地址（`.env.development`）
- [ ] 拉取后端 OpenAPI Schema，生成 TS 类型

---

## 2. 技术栈 Checklist

| 模块 | 方案 | 安装 | 接入 |
|---|---|---|---|
| 框架 | Expo Dev Client | ☐ | ☐ |
| 语言 | TypeScript | ☐ | ☐ |
| 路由 | `@react-navigation/native-stack` + `bottom-tabs` | ☐ | ☐ |
| 请求 | Axios | ☐ | ☐ |
| 服务端状态 | TanStack Query | ☐ | ☐ |
| 本地状态 | Zustand | ☐ | ☐ |
| 表单 | React Hook Form | ☐ | ☐ |
| 图片选择 | `expo-image-picker` | ☐ | ☐ |
| 相机 | `expo-camera` | ☐ | ☐ |
| 图片压缩 | `expo-image-manipulator` | ☐ | ☐ |
| 本地存储 | `@react-native-async-storage/async-storage` | ☐ | ☐ |
| 安全存储 | `expo-secure-store` | ☐ | ☐ |
| UI 库 | React Native Paper / NativeWind（二选一） | ☐ | ☐ |
| 埋点 | PostHog 或自研事件接口 | ☐ | ☐ |
| 构建 | EAS Build | ☐ | ☐ |

---

## 3. 项目目录初始化 Checklist

```text
src/
├── app/{navigation,providers}
├── screens/{onboarding,today,wardrobe,settings}
├── components/{cards,forms,feedback,layout}
├── api/{client,settings,uploads,importTasks,wardrobe,recommendations}.ts
├── hooks/
├── store/
├── types/
├── utils/
└── assets/
```

- [ ] 创建上述目录结构
- [ ] 配置路径别名（`tsconfig.json` paths）
- [ ] 配置 ESLint + Prettier
- [ ] 配置 Husky + lint-staged（可选）
- [ ] 配置环境变量加载（`expo-constants` + `app.config.ts`）

---

## 4. API Client Checklist

- [ ] 实现 Axios 实例封装（`src/api/client.ts`）
- [ ] 自动注入 `X-User-Id`（仅开发环境）
- [ ] 统一处理响应结构 `{ code, message, data }`
- [ ] 统一处理错误码：`401 / 403 / 422 / 500`
- [ ] 接入 TanStack Query Provider
- [ ] 配置默认 staleTime / retry 策略

### 接口模块清单

| 模块文件 | 覆盖端点 | 完成 |
|---|---|---|
| `api/settings.ts` | `GET / PATCH /v1/user/settings` | ☐ |
| `api/recommendations.ts` | `GET /v1/recommendations/today`<br>`GET /v1/recommendations/outfits/{id}`<br>`POST .../wear`<br>`POST .../feedback` | ☐ |
| `api/wardrobe.ts` | `GET /v1/wardrobe-items`<br>`GET / PATCH / DELETE /v1/wardrobe-items/{id}` | ☐ |
| `api/uploads.ts` | `POST /v1/uploads/presign` | ☐ |
| `api/importTasks.ts` | `POST /v1/import-tasks`<br>`GET /v1/import-tasks/{id}`<br>`POST .../confirm` | ☐ |

---

## 5. 导航结构 Checklist

```text
RootStack
├── OnboardingStack
│   ├── Welcome
│   ├── Permission
│   └── DepartureTime
└── MainTabs (3 tabs)
    ├── TodayStack
    │   ├── Today
    │   └── OutfitDetail
    ├── WardrobeStack
    │   ├── WardrobeList
    │   ├── ItemDetail
    │   ├── AddItem
    │   ├── ImportConfirm
    │   └── ImportFailure
    └── SettingsStack
        └── Settings
```

- [ ] RootStack：根据 onboarding 完成状态切换
- [ ] OnboardingStack：3 屏顺序固定
- [ ] MainTabs：3 个 Tab（今日 / 衣橱 / 设置）
- [ ] 各 Stack 的 header 样式统一
- [ ] 添加衣物入口仅从衣橱主按钮进入（不做单独 Tab）
- [ ] OutfitDetail 支持反馈弹层（modal presentation）

---

## 6. 页面开发 Checklist（共 12 个）

> 每个页面至少实现 5 类状态：**首次加载 / 有数据 / 空状态 / 错误状态 / 操作中**。

### 6.1 Web 落地页

- [ ] 首屏标题与副文案
- [ ] 主 CTA：加入 TestFlight
- [ ] 次 CTA：查看产品说明
- [ ] 3 张产品截图（今日推荐 / 衣橱 / 添加衣物）
- [ ] 内测说明
- [ ] 隐私说明
- [ ] 移动端适配
- [ ] 埋点：`landing_viewed`

### 6.2 欢迎页 (Welcome)

- [ ] 价值主张文案
- [ ] 2 个利益点：省时间 / 少纠结
- [ ] 主按钮「开始使用」
- [ ] 次入口「稍后设置」
- [ ] **不做**：多页轮播 onboarding、权限申请
- [ ] 埋点：`onboarding_started`

### 6.3 权限申请页 (Permission)

- [ ] 相机权限申请 + 状态展示
- [ ] 相册权限申请 + 状态展示
- [ ] 三态展示：未授权 / 已授权 / 被拒绝
- [ ] 主按钮「允许访问」
- [ ] 次按钮「暂时跳过」
- [ ] **不申请**：推送、定位、通讯录

### 6.4 出门时间设置页 (DepartureTime)

- [ ] 时间选择器（默认建议 8:30）
- [ ] 文案明确：不会发送推送
- [ ] 主按钮「保存并继续」→ 调 `PATCH /v1/user/settings`
- [ ] 次按钮「跳过」
- [ ] 埋点：`departure_time_saved`

### 6.5 今日推荐页 (Today) ⭐ 核心

- [ ] 顶部日期 + 倒计时「距离出门 XX 分钟」
- [ ] 1–3 套推荐卡片（稳妥 / 快速 / 有变化）
- [ ] 卡片含：衣物缩略图、推荐理由、核心单品
- [ ] 操作：查看详情、今天穿这套
- [ ] 下拉刷新
- [ ] 状态处理：
  - [ ] `ready` 正常展示
  - [ ] `insufficient_items` 展示补录引导
  - [ ] `selected` 已选中状态
  - [ ] `stale_fallback` 展示昨日 + 轻提示
- [ ] **硬性约束**：首屏不能只显示 loading
- [ ] 埋点：`today_viewed`

### 6.6 推荐详情页 (OutfitDetail)

- [ ] 搭配名称 + 类型标签
- [ ] 单品大图 / 缩略图列表
- [ ] 每件衣物：名称、品类、颜色
- [ ] 推荐理由
- [ ] 主按钮「今天穿这套」
- [ ] 次操作：喜欢 / 不喜欢 / 返回
- [ ] 埋点：`outfit_detail_viewed`、`outfit_worn`

### 6.7 推荐反馈弹层 (FeedbackSheet)

- [ ] 喜欢按钮
- [ ] 不喜欢按钮
- [ ] 关闭按钮
- [ ] **不做**：原因标签、问卷、文字备注
- [ ] 埋点：`outfit_feedback_sent`

### 6.8 衣橱列表页 (WardrobeList)

- [ ] 双列卡片网格
- [ ] 品类 Tab：全部 / 上衣 / 下装 / 鞋 / 外套 / 配饰
- [ ] 卡片：图片、名称、颜色、状态徽标
- [ ] 添加衣物按钮（FAB 或顶部）
- [ ] 点击进入衣物详情
- [ ] 空状态引导添加
- [ ] **不做**：搜索、批量编辑、季节筛选

### 6.9 衣物详情页 (ItemDetail)

- [ ] 主图展示
- [ ] 内联编辑：名称、品类、颜色
- [ ] 状态切换：可穿 / 暂不可用
- [ ] 删除衣物（二次确认）
- [ ] **不做**：单独编辑页

### 6.10 添加衣物入口页 (AddItem)

- [ ] 拍照添加
- [ ] 从相册选择
- [ ] 导入说明文案
- [ ] 调用系统相机 / 相册
- [ ] 埋点：`add_item_started`、`image_selected`

### 6.11 导入确认页 (ImportConfirm)

- [ ] 展示上传图片
- [ ] 展示识别结果
- [ ] 可编辑字段：名称 / 品类 / 颜色（仅 3 个）
- [ ] 主按钮「保存到衣橱」
- [ ] 次按钮「放弃」
- [ ] **不要求**用户补季节、风格、正式度
- [ ] 埋点：`import_confirm_viewed`、`item_saved`

### 6.12 导入失败兜底页 (ImportFailure)

- [ ] 用户可理解的失败文案
- [ ] 覆盖场景：上传失败 / 格式不支持 / >10MB / 识别失败 / 网络异常
- [ ] 主按钮「重新选择图片」
- [ ] 次按钮「返回衣橱」

### 6.13 设置页 (Settings)

- [ ] 出门时间设置入口
- [ ] 清空衣橱（二次确认）
- [ ] 隐私说明
- [ ] 版本号
- [ ] **不放**：推送设置、账号体系、风格偏好

---

## 7. 图片上传链路 Checklist

```text
拍照/选图 → 压缩 → presign → PUT 到对象存储
         → 创建 import-task → 轮询/获取结果
         → 导入确认页 → confirm → 衣橱刷新
```

- [ ] 限制图片格式：JPEG / PNG / WebP
- [ ] 限制图片大小：≤ 10MB
- [ ] 上传前压缩（`expo-image-manipulator`）
- [ ] 移动网络下展示上传进度
- [ ] 失败 → 跳转导入失败兜底页
- [ ] 成功 → 衣橱列表 invalidate（TanStack Query）

---

## 8. 状态管理 Checklist

### TanStack Query（服务端状态）

- [ ] `settings`
- [ ] `todayRecommendation`
- [ ] `wardrobeItems`
- [ ] `wardrobeItemDetail`
- [ ] `importTask`

### Zustand（客户端 UI 状态）

- [ ] onboarding 完成状态
- [ ] 当前开发用户 ID
- [ ] 本地草稿
- [ ] 全局 toast / snackbar

### 本地持久化

- [ ] onboarding 完成状态 → AsyncStorage
- [ ] 开发用户 ID → SecureStore 或 AsyncStorage
- [ ] **不持久化**完整衣物数据（以服务端为准）

---

## 9. 埋点事件 Checklist

| 事件名 | 触发时机 | 完成 |
|---|---|---|
| `landing_viewed` | Web 落地页曝光 | ☐ |
| `onboarding_started` | 点击开始使用 | ☐ |
| `departure_time_saved` | 保存出门时间 | ☐ |
| `add_item_started` | 点击添加衣物 | ☐ |
| `image_selected` | 选择/拍摄图片 | ☐ |
| `import_confirm_viewed` | 进入导入确认页 | ☐ |
| `item_saved` | 保存衣物 | ☐ |
| `today_viewed` | 今日推荐页曝光 | ☐ |
| `outfit_detail_viewed` | 推荐详情曝光 | ☐ |
| `outfit_worn` | 点击「今天穿这套」 | ☐ |
| `outfit_feedback_sent` | 提交喜欢/不喜欢 | ☐ |

---

## 10. 里程碑 Checklist

### 第 1 周：设计与前端基础

- [ ] 确认页面范围
- [ ] 完成信息架构与主流程
- [ ] 搭建 RN 项目
- [ ] 接入导航 / API Client / Query Provider
- [ ] 通用组件骨架

### 第 2 周：衣橱与导入

- [ ] 衣橱列表页
- [ ] 衣物详情页
- [ ] 添加衣物入口页
- [ ] 图片选择 + 压缩 + 上传
- [ ] 导入确认页
- [ ] 导入失败兜底页

### 第 3 周：今日推荐闭环

- [ ] 今日推荐页（含全部状态）
- [ ] 推荐详情页
- [ ] 「今天穿这套」流程
- [ ] 喜欢/不喜欢反馈

### 第 4 周：设置、状态与打磨

- [ ] 出门时间设置
- [ ] 设置页
- [ ] 全部页面的空/错误状态
- [ ] 完整埋点接入
- [ ] EAS Build → TestFlight 内测包

---

## 11. 提测前自检 Checklist

### 功能

- [ ] 首次启动完整 onboarding 流程可走通
- [ ] 添加 ≥ 3 件衣物后能成功生成今日推荐
- [ ] 「今天穿这套」状态可正确写入并展示
- [ ] 喜欢/不喜欢反馈成功落库
- [ ] 衣物增删改可同步影响今日推荐（重算后）

### 状态覆盖

- [ ] 每个页面 5 类状态都已实现并自测
- [ ] 今日推荐无任何"全屏 loading"路径
- [ ] 导入失败可恢复，不阻塞继续添加

### 性能与体验

- [ ] 冷启动 → 今日推荐首屏可见 ≤ 2s
- [ ] 图片压缩后单张 ≤ 1MB
- [ ] iPhone 15 / 16 标准尺寸适配无截断

### 隐私与合规

- [ ] 相机/相册权限文案符合 App Store 规范
- [ ] 隐私说明文本与设置页一致
- [ ] 不上报除埋点之外的用户敏感数据

### 构建

- [ ] EAS Build 成功生成 iOS 包
- [ ] TestFlight 内测分发跑通
- [ ] 版本号与 build number 已更新

---

## 12. V1 Slim 不做清单（重要 ❌）

> 以下能力**不进入** V1 首版，避免范围蔓延。

- ❌ 链接导入 / 分享扩展 / 截图导入
- ❌ 推送通知 / 定位 / 通讯录权限
- ❌ 穿搭历史页
- ❌ 风格偏好问卷
- ❌ 天气接入 / 场景切换
- ❌ 虚拟试穿
- ❌ LLM 文案生成
- ❌ 复杂筛选 / 搜索 / 批量编辑
- ❌ 账号体系（开发期用 `X-User-Id`）
- ❌ 单独的衣物编辑页（详情页内联完成）
