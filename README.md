<div align="center">
  <img src="Edgechat.png" alt="Edgechat 标志" />
</div>

[GitHub 仓库](https://github.com/gdz66601/Edgechat) · [项目文档](https://echat.azora.top/) · [开源协议（GPL v3 或更高版本）](https://www.gnu.org/licenses/gpl-3.0)

EdgeChat 是一个部署在 Cloudflare 上的聊天系统，提供账号体系、公开群组、私有群组、私信、实时消息、文件上传和管理员后台，目标是在 Cloudflare 生态中以较低运维成本实现一套可直接落地的站内 IM。

本项目采用 `GPL-3.0-or-later` 协议，详见 [LICENSE](LICENSE)。

## 功能特性

- 管理员创建用户，不开放自助注册
- 支持公开群组、私有群组与私信会话
- 群主管理成员，管理员可查看任意群组和私信消息
- 支持实时消息、历史消息分页、消息检索、文件发送
- 支持引用消息，可在会话内回复并跳转到原消息
- 支持文件上传与头像管理，默认大文件上限为 200MB，并通过流式写入 R2 降低 Worker 内存占用
- 后台包含用户管理、消息查看、网站设置三个子页面
- 现代化 Liquid Glass 风格界面，已适配移动端并支持基础无障碍能力
- 支持定时硬删除过期消息

## 技术栈

- 前端：Vue 3、Vue Router、Vite
- 后端：Cloudflare Workers、Hono
- 实时层：Durable Objects WebSocket Hibernation
- 数据库：Cloudflare D1
- 会话：Cloudflare KV
- 文件：Cloudflare R2
- 部署：Wrangler、GitHub Actions

## 部署

### GitHub Actions 自动部署

推荐优先使用 GitHub Actions 部署，适合长期维护和生产环境更新。

- 快速开始：<https://echat.azora.top/guide/getting-started.html>
- 详细教程：<https://echat.azora.top/guide/actions-deploy.html>

仓库内已提供 `.github/workflows/deploy-worker.yml`，推送到 `master` 或 `main`，或手动触发 `workflow_dispatch` 后即可执行自动部署。

### 手动部署

如果你希望本地手动部署，完整步骤、资源准备和注意事项请查看文档站教程：

- 手动部署教程：<https://echat.azora.top/guide/getting-started.html>
- 文档首页：<https://echat.azora.top/>
- Docker 本地部署：[DOCKER.md](DOCKER.md)

## 快速开始

### 安装依赖

```bash
npm install
```

### 前端开发

```bash
npm run dev:frontend
```

### 本地构建

```bash
npm run build
```


### 本地运行记录

本地已使用 `wrangler.example.toml` 生成忽略提交的 `wrangler.toml`，并在 `http://127.0.0.1:8788` 启动完整 Worker 本地服务。

本地初始化命令：

```bash
npm run build
npx wrangler d1 execute cfchat-db --local --file=./worker/schema.sql
EDGECHAT_ADMIN_USERNAME=admin EDGECHAT_ADMIN_PASSWORD=admin EDGECHAT_ADMIN_DISPLAY_NAME=Administrator node .github/scripts/generate-admin-bootstrap-sql.mjs
npx wrangler d1 execute cfchat-db --local --file=.tmp/edgechat-admin-upsert.sql
npx wrangler dev --local --ip 127.0.0.1 --port 8788
```

本地默认管理员：`admin / admin`。本地 D1、KV、R2 数据位于 `.wrangler/state/`，该目录不会提交到 Git。

### 上传大小配置

默认单文件上传上限为 `200MB`。如需按部署环境调整，可在 Cloudflare Worker 环境变量中设置：

- `MAX_UPLOAD_FILE_SIZE`：推荐的新配置项，单位为字节，例如 `524288000` 表示 500MB。
- `MAX_FILE_SIZE`：旧配置项，仍会作为兼容 fallback。

上传接口会将文件流式写入 R2，避免先整体读入内存，适合更大的图片、视频和压缩包附件。

### 本地手动发布

```bash
npm run deploy
```

在非交互环境下部署时，需要提前设置 `CLOUDFLARE_API_TOKEN`。

PowerShell 示例：

```powershell
$env:CLOUDFLARE_API_TOKEN = "your-token"
npm run deploy
```

## 项目结构

```text
edgechat/
├─ frontend/
│  ├─ src/
│  │  ├─ api.js
│  │  ├─ router.js
│  │  ├─ store.js
│  │  ├─ ws.js
│  │  ├─ styles.css
│  │  ├─ components/ui/
│  │  └─ pages/
│  └─ vite.config.js
├─ worker/
│  ├─ schema.sql
│  ├─ migrations/
│  └─ src/
│     ├─ index.js
│     ├─ auth.js
│     ├─ db.js
│     ├─ middleware.js
│     ├─ utils.js
│     ├─ api/
│     └─ do/
├─ wrangler.toml
├─ package.json
├─ README.md
└─ LICENSE
```

## 本次完善记录

- 移动端聊天页改为“会话列表 / 聊天窗口”单屏切换，使用 `100dvh` 与安全区 padding 适配手机浏览器。
- 消息模型新增 `reply_to_message_id`，前端支持选择“引用”、发送引用消息、展示引用摘要并点击定位原消息。
- 上传接口默认上限提升至 200MB，并改用 `file.stream()` 直接写入 R2；新增 `MAX_UPLOAD_FILE_SIZE` 环境变量说明。
- 修复上传大文件被 `/api/*` JSON 请求体保护误拦截的问题：现在仅对 `application/json` 请求应用 10MB JSON 限制，附件上传交由上传接口独立校验。
- 修复桌面端从消息气泡移动到“引用”按钮时按钮消失的问题，并保留移动端引用按钮常显。
- 已在 390×844 移动端视口检查登录页布局，并通过构建后的移动端 CSS 规则验证聊天页单屏切换与安全区适配。
- 修复生产部署后“服务器开小差了”的 D1 结构兼容问题：GitHub Actions 现在会在每次部署前检查远程 D1，缺少 `reply_to_message_id` 时自动执行引用消息迁移。
- 新增消息已读/未读明细：点击气泡内“已读状态/状态”可查看谁已读、谁未读。
- 新增附件图床配置：后台网站设置可在 Cloudflare R2 与 CFBed 图床之间切换，并配置 CFBed 地址、鉴权码、Token、上传接口路径、渠道和目录；CFBed 默认上传路径为 `/upload`，兼容 CFBed 返回的 `[{ src: ... }]` 响应。
- 聊天附件上传新增进度条，图片和附件选择后显示 1–100% 上传进度。
- 上传视频附件时，消息气泡内直接显示带控制条的视频预览，并按视频自身横竖比例自适应展示（例如 9:16 竖屏视频按竖屏框展示），同时保留打开原视频链接。
- 新增钉钉机器人推送：后台网站设置可配置 Webhook，收到新消息后推送“来自谁谁的新消息”，并可选择是否包含消息内容。

更多实现说明可查看 [TECHNICAL.md](TECHNICAL.md) 和文档站：<https://echat.azora.top/>

## 贡献

欢迎提交 Issue 和 Pull Request，一起完善 EdgeChat。

## 贡献者

感谢所有为项目提供帮助的贡献者：

[![贡献者](https://contrib.rocks/image?repo=gdz66601/Edgechat)](https://github.com/gdz66601/Edgechat/graphs/contributors)

## 鸣谢

感谢 <a href="https://linux.do" target="_blank">linux do</a> 在推广方面为本项目做出的贡献。

## 协议说明

本项目采用 `GNU GPL v3.0 or later`。

你可以使用、修改和分发本项目；如果你分发修改版本，需要继续提供对应源代码，并保持 GPL 兼容。
