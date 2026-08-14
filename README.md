# 30部动漫推荐

一个本地优先的动画 30 天打卡工具。作品与角色来自 Bangumi；用户的昵称、选择、短评和手工图片只保存在浏览器 IndexedDB，可导入/导出 JSON 备份，并生成一张高清 5×6 PNG。

## 开发

```bash
npm install
npm run dev
```

复制 `.env.example` 为 `.env.local` 后配置部署好的 Cloudflare Worker 地址。没有配置时，开发环境将直接尝试访问 `api.bgm.tv`；可使用手工填写作为网络不可用时的回退。

## 验证

```bash
npm test
npm run build
npm run test:e2e
```

## 发布

在 GitHub 仓库中启用 Pages 的 **GitHub Actions** source，并设置 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` 两个 Actions Secret。推送至 `main` 后，工作流会发布 GitHub Pages 与 Cloudflare Worker。

Worker 只允许代理 Bangumi 的动画/角色搜索与图片资源，不存储或记录用户填写内容。

同时在 GitHub Actions Variables 设置 `BANGUMI_PROXY_URL`（已部署 Worker 的 `workers.dev` 地址）；它会在构建时写入前端，确保生产环境的搜索与导出图片均经过代理。
