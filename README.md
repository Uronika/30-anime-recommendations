# 30部动漫推荐

一个本地优先的动画 30 天打卡工具。作品与角色来自 Bangumi；用户的昵称、选择、短评和手工图片只保存在浏览器 IndexedDB，可导入/导出 JSON 备份，并生成一张高清 5×6 PNG。

## 开发

```bash
npm install
npm run dev
```

在 EdgeOne Makers 部署时，前端会通过同源的 `/api` 访问 Bangumi，EdgeOne 边缘函数负责严格白名单代理，浏览器不会直接请求 `bgm.tv`。`VITE_BANGUMI_PROXY_URL` 仅用于现有 GitHub Pages 的过渡部署；本地或 EdgeOne 环境无需配置它。

## 验证

```bash
npm test
npm run build
npm run test:e2e
```

## 发布

推荐将 GitHub 仓库导入 **EdgeOne Makers**：它会按 [`edgeone.json`](./edgeone.json) 执行 `npm ci`、`npm run build`，并发布 `dist`。`edge-functions/api/[[default]].js` 会自动处理 `/api/*`，无需配置 Cloudflare Token 或另行部署 Worker。

EdgeOne 函数只允许代理 Bangumi 的动画/角色搜索、详情和封面/头像资源，不存储或记录用户填写内容。请在 EdgeOne 控制台完成 GitHub 授权、选择此仓库和 `main` 分支，然后用它提供的预览域名验证搜索与导出；确认可用后再把该域名作为对外链接。

GitHub Pages 工作流会暂时保留，以免现有链接失效；其需要既有的 `BANGUMI_PROXY_URL` Actions Variable。EdgeOne 接管后可在仓库设置中删除这个 Variable 和旧的 Cloudflare Secrets。
