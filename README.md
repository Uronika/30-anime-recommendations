# 30部动漫推荐

把动画记忆整理成一张可以长期保存的个人档案：30 个固定题目、每题最多 100 字短评，最后导出高清 5 × 6 PNG。

**正式网址：[uronika.github.io/30-anime-recommendations](https://uronika.github.io/30-anime-recommendations/)**

## 现在能做什么

- 任意填写 30 个 Day；包括 Day 6–9 与 Day 28 在内的每一题，都可从同一个 Bangumi 档案中选择作品或角色。
- 静态资料库覆盖书籍/漫画、动画、游戏、音乐和角色，默认也显示 NSFW 记录。原有 Day 28 的“曲目 + 关联动画”旧备份仍可导入、显示、导出。
- 搜索支持中文名、日文原名、白名单别名、中文全拼与拼音首字母；第一次搜索会显示离线资料库的真实准备进度。
- 静态快照有结果时不请求网络 API；零结果或静态加载失败时，才直接请求 Bangumi 官方 `api.bgm.tv` 作为在线补充。也可在搜索框下主动勾选“直接使用 Bangumi 官方 API”，跳过离线资料库；在线补充也失败时可继续手工填写。
- 直连 Bangumi API 的条目与角色会自动记录官方封面 URL；编辑页可直接显示，个人上传图片优先覆盖。PNG 导出仅绘制通过 CORS 验证的远程图片，验证失败时自动使用类型占位卡，下载不会中断。个人图片先在浏览器压缩，只保存到当前浏览器和 JSON 备份。
- 档案级“显示封面图片”默认关闭。关闭时编辑页和 PNG 海报均不会预留空白图片区；开启时优先显示个人图片，缺图时显示类型占位卡。
- 所有档案、短评、开关与个人图片保存在 IndexedDB；可完整导入/导出 JSON。资料库缓存不进入备份，清除本机档案时会一并移除。

## 使用方法

1. 打开[正式网站](https://uronika.github.io/30-anime-recommendations/)，按需填写昵称、副标题与封面显示开关。
2. 在顶部选择任意 Day，输入作品、角色、别名或拼音；默认使用 Archive 快照。若网络能够直连 Bangumi 且想跳过首次离线索引准备，可勾选“直接使用 Bangumi 官方 API”。从结果中选择，或点击“手工填写”。
3. 填写 0–100 字短评。页面会自动保存到当前浏览器。
4. 需要迁移时点击“导出备份”；新设备上用“导入备份”恢复。
5. 点击“下载 5×6 PNG”下载约 3000px 宽的海报。未填写卡片会显示“待补完”。

## Bangumi Archive 静态主源

当前版本固定使用 `dump-2026-08-11.210343Z.zip`（432,714,422 bytes，SHA-256：`d1f6865e64c7b9a848621bb7d4bd55e31cbef3395935df37e49bdc597ce609c8`）。GitHub Actions 在每次 Pages 构建中下载或恢复缓存、验证大小和 SHA-256，再生成只含搜索与详情所需字段的分片；任一校验失败都会停止发布，线上上一版保持不变。

原始 ZIP 不会公开部署。发布物只含搜索分片、详情分片与快照清单，不含原始 `infobox` 或用户数据。完整字段、缓存、回退与验收规则见 [Archive 静态主源说明](./docs/archive-static-source.md)。

Pages 是纯静态网站，不再默认使用 Cloudflare Worker 或其他代理。若当前网络无法直连 `api.bgm.tv`，不影响已有 Archive 静态资料库与手工填写；仅“在线补充”不可用。

## 隐私与数据来源

- 没有登录、账号、云同步、公开个人主页或用户数据库。
- 个人档案存于浏览器 IndexedDB（`anime-30-day-archive`）。清除浏览器站点数据会清除档案，重要内容请先导出 JSON。
- 浏览器首次静态搜索会缓存资料库索引；这是公开的 Archive 派生数据，不含昵称、短评或上传图片，也不会导出到 JSON。
- Bangumi Archive 与官方 API 的条目、角色数据来自 [Bangumi](https://bgm.tv/)；本项目不代表 Bangumi 官方，使用时应遵循其相关规则。

## 本地开发、构建与验收

需要 Node.js 24 和 npm：

```powershell
npm ci
npm run archive:build
npm run archive:benchmark -- --assert --output artifacts/archive-benchmark.json
npm test
npm run build
npm run test:e2e
```

`archive:build` 会下载约 433 MB 的固定 Archive 输入（本地已有缓存时会先校验再复用），并生成未提交的 `public/archive-data/` 分片。`archive:benchmark` 对 160 条固定用例评分；中文名、日文原名要求至少 95%，别名、长尾、同名、NSFW、热门角色要求至少 80%。当前快照的可复查汇总见 [`docs/archive-benchmark-summary.json`](./docs/archive-benchmark-summary.json)。

## GitHub Pages 发布

仓库在 **Settings → Pages** 中将 Source 设为 **GitHub Actions**。推送到 `main` 后，工作流会：

1. 安装依赖并恢复固定 Archive 的 Actions 缓存；
2. 校验 ZIP 大小与 SHA-256，生成静态分片；
3. 运行单元测试与静态搜索基准；
4. 构建 `dist` 并发布 GitHub Pages。

不需要配置 Cloudflare Token、Worker URL 或任何代理 Secrets；`worker/` 仅保留为未来实验源码，默认工作流不会发布或调用它。

## 版本记录与研究历史

- 完整变更见 [CHANGELOG.md](./CHANGELOG.md)，发布包见 [GitHub Releases](https://github.com/Uronika/30-anime-recommendations/releases)。
- `research/domestic-anime-data` 分支保留此前对国内直连替代数据源的评估。当前产品采用 Bangumi Archive 静态主源，并未宣称 `api.bgm.tv` 在中国大陆可直连。

## 技术栈

React、TypeScript、Vite、IndexedDB（`idb`）、Canvas、Vitest、Playwright、GitHub Actions、GitHub Pages 与 Bangumi Archive。
