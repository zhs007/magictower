# Map Editor — 开发指南（单进程）

# Map Editor — Development README

本说明文档介绍 Map Editor 在开发环境下的启动方式、涉及的服务、API 列表以及常见问题排查。

当前为单进程开发模式：同一个进程同时运行 Fastify（提供 /api 与 /assets）和 Vite dev 中间件（提供 /src/\* 模块、HMR 以及 index.html）。

## 一、快速开始

- 运行（仓库根目录下执行）：

```bash
pnpm --filter @proj-tower/mapeditor dev
```

- 打开浏览器访问：http://localhost:5173

单进程说明：`apps/mapeditor/src/run-server.ts` 会创建一个 HTTP 服务器，并将请求按规则分发：

- `GET /api/*` 与 `GET /assets/*` → 交给 Fastify 路由处理（返回 JSON 与图片等）
- 其他所有请求（/、/src/\* 等）→ 交给 Vite 中间件处理（模块加载与 HMR）

你无需再单独启动一个 API 进程，也不需要 Vite 的 dev 代理。

## 二、关键文件

- `apps/mapeditor/src/server.ts`
    - 默认导出一个 async 工厂函数，创建并返回 Fastify 实例（注册 `/api` 与 `/assets` 路由），并提供 `app.routing(req, res)` 便于上层转发。
- `apps/mapeditor/src/run-server.ts`
    - 单进程入口：创建 Vite（middlewareMode: true）与 Fastify，并在同一个 HTTP 服务器中组合它们。
    - 环境变量：`HOST`（默认 `0.0.0.0`）、`PORT`（默认 `5173`）。
- `apps/mapeditor/vite.config.ts`
    - 开发环境不启用 `vite-plugin-fastify`；仅在 build/preview 时启用。
- `apps/mapeditor/index.html` 与 `apps/mapeditor/src/client/main.ts`
    - 客户端入口与主模块。

## 三、开发环境 API 列表

- GET `/api/maps` — 返回地图 id 列表（来自仓库根目录 `mapdata/*.json`）
- GET `/api/maps/:mapId` — 返回指定地图 JSON
- POST `/api/maps/:mapId` — 保存指定地图 JSON
- GET `/api/assets/tiles` — 返回图块资源名列表（来自仓库根目录 `assets/map/*.png`）
- GET `/assets/map/:file` — 返回 PNG 资源文件（客户端用来渲染）

## 四、常见问题排查

1. 浏览器报错 `Unexpected token '<', "<!DOCTYPE "...`（JSON 解析失败）

- 含义：请求本应返回 JSON，却收到 HTML（通常是 index.html）。
- 解决：确认请求路径是否以 `/api` 开头；在 Network 面板查看该请求的 Response Headers，`content-type` 应为 `application/json`。
- 当前单进程路由规则会将 `/api/*` 明确交给 Fastify，正常不会再遇到此问题。如仍存在，请提供具体请求 URL 与返回体。

2. `/src/client/main.ts` 404

- 说明 Vite 中间件未接管模块请求或文件不存在。
- 解决：
    - 确认服务通过 `pnpm --filter @proj-tower/mapeditor dev` 启动成功。
    - 确认文件存在于 `apps/mapeditor/src/client/main.ts`。
    - 强制刷新浏览器（或清缓存）。

3. Pixi 警告 `Asset id ... was not found in the Cache`

- 说明资源未加载成功。打开 Network 面板确认：
    - `/assets/map/*.png` 返回 200 且 `content-type: image/png`。
    - 如果 404，请检查 `assets/map` 下是否存在对应文件名（不带 `map_` 前缀的真实 png 文件）。

4. 端口占用

- 默认监听 `5173`。如果被占用：
    - 调整环境变量：`PORT=5174 pnpm --filter @proj-tower/mapeditor dev`。
    - 或者结束占用进程：`lsof -i :5173 -t | xargs kill`。

## 五、可选：二进程（旧方案）

早前的双进程（Vite + 独立 Fastify）方案仍保留脚本，但默认不推荐：

- 启动 API：`pnpm --filter @proj-tower/mapeditor run dev:server`
- 启动 Vite：`pnpm --filter @proj-tower/mapeditor vite`
- 此方案需要配置 Vite 代理 `/api` 与 `/assets`，且容易出现“代理连接失败”的竞态问题。

## 六、快速自检命令

以下命令有助于确认服务健康（可选）：

```bash
# JSON 应返回 200 和 application/json
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:5173/api/maps

# 图片应返回 200 和 image/png（以 floor.png 为例）
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:5173/assets/map/floor.png
```

---

如需，我可以：

- 增加 `/health` 健康检查路由；
- 在 README 中加入更详细的端到端操作说明或 GIF；
- 为 API 增加 vitest 单测，保障地图读写与资源列举的稳定性。
