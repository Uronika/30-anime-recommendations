# Bangumi Archive 冻结静态主源

## 固定输入与发布规则

本版本只接受以下 Bangumi Archive 输入：

| 项目 | 值 |
| --- | --- |
| 文件 | `dump-2026-08-11.210343Z.zip` |
| 地址 | `https://github.com/bangumi/Archive/releases/download/archive/dump-2026-08-11.210343Z.zip` |
| 大小 | `432714422` bytes |
| SHA-256 | `d1f6865e64c7b9a848621bb7d4bd55e31cbef3395935df37e49bdc597ce609c8` |

GitHub Actions 在构建前恢复或下载这个 ZIP，并同时校验大小与 SHA-256。任意下载、大小或哈希错误都会让工作流失败，因此不会覆盖当前 Pages。原始 ZIP 不会发布。

构建只发布派生的搜索分片、按需详情分片和清单：书籍/漫画、动画、游戏、音乐条目，以及全部角色（包括只关联三次元条目的角色）。三次元作品不进入索引；原始 `infobox` 不发布。

## 浏览器行为

第一次静态搜索会下载 64 个搜索分片并缓存至当前站点的 IndexedDB；详情仅在用户实际选择某条记录时下载对应分片。缓存不写入 JSON 备份，点击页面底部的“清除本机档案与资料库缓存”会同时移除档案与这些分片。

搜索匹配中文名、原名、白名单别名、中文拼音全拼和首字母，忽略全半角、大小写、空格和标点。白名单字段仅为：中文名、简体中文名、别名、英文名、英文名二、日文名、罗马字、纯假名、昵称、第二中文名。日文汉字不会被猜测性转换为罗马字。

静态结果为零，或静态资料库加载失败时，才会直接请求 `https://api.bgm.tv`。在线结果仅包含书籍/漫画、动画、游戏、音乐与角色；用户只会把最终选中的在线条目存入个人档案。没有 Worker、代理地址或用户数据上传。

## 160 条固定验收

运行命令：

```powershell
npm run archive:build
npm run archive:benchmark -- --assert --output artifacts/archive-benchmark.json
```

2026-08-14 用固定快照实际运行的汇总在 [`archive-benchmark-summary.json`](./archive-benchmark-summary.json)。门槛是中文名和日文原名均不低于 95%，别名、长尾、同名、NSFW 与热门角色均不低于 80%。书籍/漫画、游戏、音乐各新增 20 条用例，只在总体类别门槛中评估，不附加独立通过率要求。
