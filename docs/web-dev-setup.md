# Web 端本地联调指南（Expo Web ↔ FastAPI 后端）

本仓库是 iOS 原型的 React Native + Expo 实现。**Web 端不是另写一套**，而是直接用
`react-native-web` 让同一套 RN 代码跑在浏览器里 —— 验证完即可零成本迁回 iOS。

## 一、为什么能跑 Web（关键改动）

| 改动 | 原因 |
|---|---|
| `app.config.ts` `platforms: ['ios','web']` | 开启 web 目标 |
| `.npmrc` `node-linker=hoisted` | Expo/Metro 需要扁平 node_modules；pnpm 默认的隔离软链会让深层导入（`react-native-css-interop/jsx-runtime`、`@babel/runtime`、`react-native-worklets/plugin`）解析失败。Expo 官方推荐此项 |
| 依赖：`react-native-web` / `react-dom` / `@expo/metro-runtime` | Expo Web 运行时 |
| 依赖：`@babel/runtime` / `react-native-worklets` | 补齐 nativewind 4.2 babel preset 引用的插件路径 |
| `babel.config.js` 移除 `react-native-reanimated/plugin` | `src/` 未使用 reanimated（轮播是 `FlatList`），该插件在 web 下找不到 worklets 插件而打包失败 |

> 这些都是**打包管线**层面的改动，不改任何业务/UI 代码，iOS 行为不受影响。

## 二、启动前端 Web

```bash
pnpm install            # 会按 .npmrc 走 hoisted 布局
pnpm web                # 等价 expo start --web，默认 8081；可加 --port
# 浏览器打开 http://localhost:8081（或所选端口）
```

环境变量（`.env.development` 或启动时注入）：

```env
APP_ENV=development
API_BASE_URL=http://localhost:8000
DEV_USER_ID=00000000-0000-4000-8000-000000000001   # 必须是 UUID
```

开发态鉴权走后端的 `X-User-Id` 快捷方式（`expo-secure-store` 在 web 下不可用，
`devUser`/`auth` store 已有 try/catch 降级，自动回退到 `DEV_USER_ID`）。Apple 登录仅
生产态出现，web 验证不需要。

## 三、启动后端（FastAPI）

后端仓库在 `D:\project\Python\aidrobe`。Web 联调需要：PostgreSQL + Redis + CORS + UTF-8。

```bash
# 1) 依赖容器（独立 pgvector + 复用本机 redis:6379）
docker run -d --name aidrobe-pg -e POSTGRES_DB=aidrobe -e POSTGRES_USER=aidrobe \
  -e POSTGRES_PASSWORD=aidrobe -p 5432:5432 pgvector/pgvector:pg16
# Redis 已在 6379 即可（docker run -d --name aidrobe-redis -p 6379:6379 redis:7-alpine）

# 2) 建库 schema —— 见下方“迁移注意”，用 create_all 而非 alembic
# 3) 启动服务（Windows 必须强制 UTF-8，否则 CLI 横幅里的 emoji 触发 GBK 崩溃）
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 \
  uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
# 健康检查在 /healthz（不是 /health）
```

`.env`（后端，已为 dev 配好，零外部 key）：

```env
APP_ENV=dev
VISION_PROVIDER=fake          # 识别走桩，无需视觉 API key
DATABASE_URL=postgresql+asyncpg://aidrobe:aidrobe@localhost:5432/aidrobe
REDIS_URL=redis://localhost:6380/0   # 专用 redis，避开占用 6379 的他项目实例
ARQ_REDIS_URL=redis://localhost:6380/1
ENABLE_TODAY_REFRESH=true      # 允许 POST /today/refresh 即时生成推荐
ENABLE_TODAY_CONTEXT=true
# 上传走 minio（见“图片上传/导入”），让 presign 出可上传的真实 URL：
STORAGE_PROVIDER=s3
S3_BUCKET=aidrobe
S3_ENDPOINT_URL=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_REGION=us-east-1
S3_PUBLIC_BASE_URL=http://localhost:9000/aidrobe
```

### 图片上传 / 导入（minio）

`STORAGE_PROVIDER=local` 的 presign URL 没有服务处理，无法上传；改用 minio：

```bash
docker run -d --name aidrobe-minio -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  -e MINIO_API_CORS_ALLOW_ORIGIN="*" \
  minio/minio:latest server /data --console-address ":9001"
# 建 bucket aidrobe + 公共读 policy（boto3 一次性脚本，见 git 历史 / 下方说明）
```

`MINIO_API_CORS_ALLOW_ORIGIN="*"` 必须设——浏览器直传 minio 会触发 CORS 预检。
bucket 设公共读 policy，这样 `file_url` 的 GET 能回显图片。

### 迁移注意（后端已知问题）

`alembic upgrade head` 在全新库上跑不通：
1. `alembic/env.py` 把多条 DDL 作为单条多语句交给 asyncpg，触发
   `cannot insert multiple commands into a prepared statement`；
2. 迁移 0018/0019/0020 用 `op.get_context().autocommit_block()` +
   `CREATE INDEX CONCURRENTLY`，在 async 迁移路径下触发 `AssertionError`。

dev 库改用 ORM 模型直接建表（最终 schema 与迁移等价，仅索引非 CONCURRENTLY）：

```python
# uv run python - <<'PY'
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.config.settings import get_settings
from app.infrastructure.persistence.models import Base
async def main():
    e = create_async_engine(get_settings().DATABASE_URL)
    async with e.begin() as c:
        await c.run_sync(Base.metadata.create_all)
        await c.exec_driver_sql("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(128) PRIMARY KEY)")
        await c.exec_driver_sql("INSERT INTO alembic_version VALUES ('0026_add_object_key_columns') ON CONFLICT DO NOTHING")
    await e.dispose()
asyncio.run(main())
PY
```

### CORS（已加）

浏览器有同源限制（原生 app 没有）。后端已加 `CORSMiddleware`：
dev/test 放行任意 `localhost`/`127.0.0.1` 源；prod 仅在 `CORS_ALLOW_ORIGINS`
配置后启用。

## 四、Playwright 验证

```bash
node scripts/web-smoke.mjs    # 加载首屏，抓控制台错误 + 截图
node scripts/web-walk.mjs     # 走完引导→今日→衣橱→详情→设置，列出命中的 /v1 接口
node scripts/web-import.mjs   # 走完 添加→相册导入→上传 minio→识别→保存到衣橱
```

脚本用系统 Chrome（`channel:'chrome'`），无需下载 Playwright 浏览器。
设置 `WALK_URL` / `SMOKE_URL` 指定端口。

## 五、已验证流程（对接实时后端，全部 200，无控制台错误）

- 引导：Welcome → Permission → DepartureTime → 主 Tab
- 今日：`GET /v1/recommendations/today`、`POST /today/refresh` 生成真实穿搭
- 衣橱：`GET /v1/wardrobe-items`、`GET /v1/insights/summary`
- 单品详情：`GET /v1/wardrobe-items/{id}`、`.../wear-history`
- 设置：`GET/PATCH /v1/user/settings`
- 添加/导入：`POST /uploads/presign` → 浏览器 presigned-POST 直传 minio(204) →
  `POST /import-tasks` → 轮询 → `POST /confirm`，fake vision 识别结果落库成衣物，
  上传图片经 minio 回显（见 `walk-shots/import-04-confirm.png`）。

## 六、导入流程的关键实现点

- **上传 PUT vs POST**：s3 provider 用 presigned **POST**（`upload_url` + `fields`），
  OSS/local 用 PUT（无 `fields`）。原前端只做 PUT 且丢弃 `fields`，s3 链路断。已修：
  后端 `PresignUploadResponse` 暴露 `fields`；前端 `uploadToPresigned()` 有 `fields`
  走 multipart POST、否则 PUT —— 一套代码兼容 s3/minio 与 OSS/local。
- **异步识别在进程内**：`POST /import-tasks` 用 FastAPI `BackgroundTasks` 内联跑
  `process_import_task_with_session`，**不需要单独 arq worker**；`VISION_PROVIDER=fake`
  纯桩、不真正拉图，按 URL 子串返回固定结果。
- **minio 必须开 CORS** + bucket 公共读（见三）。

## 七、已知设计缺口（非阻塞）

- 衣橱**非空**时列表页没有“添加衣物”入口（仅空状态 CTA / ImportFailure 能进 AddItem）。
  建议补一个常驻的 + 按钮。
