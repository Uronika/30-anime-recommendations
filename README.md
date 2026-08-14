# 30部动漫推荐

把动画记忆整理成一张可以长期保存的个人档案。这个网站提供 30 个固定主题，让你选择动画或角色、写下不超过 100 字的理由，最后导出为一张高清 5 × 6 PNG 海报。

**正式访问地址：<https://uronika.github.io/30-anime-recommendations/>**

> 当前稳定代码位于 [`github-pages-restore`](https://github.com/Uronika/30-anime-recommendations/tree/github-pages-restore) 分支。`main` 保留 EdgeOne 尝试的历史，尚未作为此稳定版本的发布来源。

## 能做什么

- 按自己的节奏完成 30 个动画主题，不需要连续打卡，也不需要登录。
- Day 6–9 搜索和选择角色；其余日期选择动画。
- Day 28 记录一首动画音乐：曲名必填，演唱或作曲信息可选，并关联一部动画作为封面。
- 每一天可写 0–100 字短评；同一部动画或角色可用于多个题目。
- 使用 Bangumi 检索动画与角色。搜索失败、没有结果或不想搜索时，可手工填写并上传本地图片。
- 自动将昵称、标题、选择、短评和压缩后的手工图片保存在当前浏览器。
- 将全部内容导出为 JSON 备份，之后可在同一或另一台设备导入恢复。
- 下载一张约 3000px 宽的 5 × 6 PNG；未填写的格子会显示“待补完”。

## 使用方法

1. 打开[正式网站](https://uronika.github.io/30-anime-recommendations/)，填写昵称和副标题（可留空）。
2. 在顶部选择任意 Day。输入关键词后，从 Bangumi 搜索结果选择动画或角色；也可以点“手工填写”。
3. 填写可选短评。每次修改都会自动保存到浏览器本地。
4. 需要迁移或留档时，点击“导出备份”；恢复时点击“导入备份”。
5. 点击“下载 5×6 PNG”生成可分享的个人动画档案。

## 数据与隐私

- 不提供账户、云同步、公开主页或用户数据库。
- 填写内容保存在浏览器的 IndexedDB（数据库名为 `anime-30-day-archive`）中；清除该网站的浏览器数据会一并清除内容。
- 手工上传的图片会先在浏览器中压缩，再保存在本地数据和 JSON 备份里。
- Bangumi 搜索仅用于查找动画、角色和封面，不会上传你的昵称、短评、备份或图片。

因此，在更换浏览器、清理站点数据或使用无痕模式前，请先导出 JSON 备份。

## Bangumi 连通性与手工回退

GitHub Pages 是纯静态网站。不同网络环境下，`api.bgm.tv` 或图片域名可能无法直连；这不会影响已有的本地记录和手工填写。

生产环境可选配一个 Cloudflare Worker 作为受限的 Bangumi 代理。Worker 只转发动画/角色搜索和封面图片请求，且不保存用户填写内容。设置代理后，GitHub Actions 会在构建时将其地址写入前端，使搜索和海报图片请求均经过该代理。

没有可用代理时，网站仍可使用：搜索提示失败后，选择“手工填写”并上传图片即可继续完成挑战和导出海报。

## 本地开发

环境要求：Node.js 24（与 GitHub Actions 保持一致）和 npm。

```bash
npm ci
Copy-Item .env.example .env.local
npm run dev
```

如果已经部署 Worker，在 `.env.local` 中填写：

```dotenv
VITE_BANGUMI_PROXY_URL=https://<你的-worker>.<你的账户>.workers.dev
```

不填写时，开发环境会直接请求 `https://api.bgm.tv`。请勿把 `.env.local` 或任何访问令牌提交到仓库。

## 测试与构建

```bash
npm test
npm run build
npm run test:e2e
```

单元测试覆盖题目分类、名称回退、短评限制、选择序列化、图片压缩与备份兼容性；端到端测试覆盖填写、自动保存、手工图片、导入导出和 PNG 海报生成。

## GitHub Pages 发布

正式地址由 GitHub Pages 提供：<https://uronika.github.io/30-anime-recommendations/>。

稳定发布应从 `github-pages-restore` 的内容进入 `main` 后触发。仓库需在 **Settings → Pages** 中将 Source 设为 **GitHub Actions**。推送到 `main` 后，`.github/workflows/deploy.yml` 会依次安装依赖、运行单元测试、构建 `dist` 并发布 Pages。

如需部署可选的 Bangumi Worker，还需在仓库的 **Settings → Secrets and variables → Actions** 配置：

| 类型 | 名称 | 用途 |
| --- | --- | --- |
| Variable | `CLOUDFLARE_ENABLED` | 设为 `true` 才会发布 Worker。 |
| Variable | `BANGUMI_PROXY_URL` | 已部署 Worker 的 `workers.dev` 地址，构建时提供给前端。 |
| Secret | `CLOUDFLARE_API_TOKEN` | 允许发布 Worker 的 Cloudflare API Token。 |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID。 |

上述密钥绝不可提交到仓库。若不配置 Worker，Pages 仍可发布和使用手工填写功能。

## 版本记录

完整变更见 [CHANGELOG.md](./CHANGELOG.md)，发布包见 [GitHub Releases](https://github.com/Uronika/30-anime-recommendations/releases)。

## 技术栈

React、TypeScript、Vite、IndexedDB（`idb`）、Canvas、Vitest、Playwright、GitHub Pages，以及可选 Cloudflare Worker。

## 许可与数据来源

Bangumi 条目、角色和图片数据由 [Bangumi](https://bgm.tv/) 提供。使用其数据时应遵循 Bangumi 的相关规则；本项目不代表 Bangumi 官方。
