# 国内直连替代数据源评测（研究分支）

**状态：替代来源仍在研究；Bangumi Archive 静态快照已作为产品主源实施。**
本文保留对“国内直连替代来源”的评估边界；它不承诺任何第三方 API 的大陆可达性。
当前产品实现与固定快照验收见 [Archive 静态主源说明](./archive-static-source.md)，不会读取或上传用户的 IndexedDB 数据。

## 结论（截至 2026-08-14）

尚未找到一个可以承诺替代 Bangumi 的单一“国内直连”数据源。原因不是候选不够，
而是**没有任何候选完成两条独立中国大陆运营商网络的浏览器验证**。因此所有候选
的大陆状态均为“未验证”，不能据此做生产承诺。

当前的实施建议是：

1. Bangumi Archive 已固定为浏览器静态主源，而不是浏览器实时依赖。它由 Bangumi
   官方按周导出条目、角色与条目—角色关联，适合非实时场景；当前版本不会把原始 ZIP 部署到 Pages。
2. 优先完成 AniList 的 100 条基准测试和三网验证；它是唯一同时具备官方公开 API、
   动画、角色、关联与图片能力的替代候选。
3. 若 AniList 通过可达性但中文命中不足，再单独评估以 `bangumi-data`（作品标题/季番
   映射）或萌娘百科（中文人工内容）补充。组合上线时必须分别显示来源和许可。
4. 不以 Jikan、Bilibili 非公开接口或未经许可的聚合服务作生产主源。

这不是“Bangumi 已被替换”的结论：Bangumi 的开发者条款明确允许在接口范围内使用
API 与归档数据，同时限制爬虫式采集；本研究仅在寻找浏览器直连失败时的备用方案。

## 评测边界与统一接口

`src/research/dataSourceContract.ts` 定义了所有候选必须说明的最小适配契约：

- 动画搜索、角色搜索、按 ID 查询与封面/头像地址；
- 条目—角色关联能力；
- 中文字段、别名与图片 Canvas 可绘制性；
- Token、限流、许可与来源层级；
- 大陆验证记录，并且只有至少两个不同的中国大陆运营商成功后才会给出“大陆可用”。

该契约是研究代码，尚未被 React 页面或 Bangumi Repository 导入，避免探索结果意外
改变当前产品行为。

## 固定基准和可重复运行方式

`research/provider-test-cases.json` 固定为 160 条：原有 65 条动画、35 条角色，外加书籍/漫画、
游戏、音乐各 20 条；覆盖中文名、日文原名、别名、长尾、同名、热门角色和 NSFW 条目。每条测试同时保存查询词与可接受名称，避免仅用“有 HTTP 返回”误判为检索可用。

```powershell
# 单一网络 HTTP 探测；结果可选地写到被 gitignore 的 artifacts/。
npm run research:probe -- --output artifacts/source-probe.json

# 小样本检索基准（默认 10 条；160 条请在允许时运行，脚本会节流）。
npm run research:benchmark -- --provider anilist --limit 10 --output artifacts/anilist-sample.json
npm run research:benchmark -- --provider jikan --limit 10
npm run research:benchmark -- --provider moegirl --limit 10

# 可用 --offset 65 从固定集中的首条角色题开始做低频烟测。
npm run research:benchmark -- --provider anilist --offset 65 --limit 2

# TMDB 仅在本地设置 Key 后运行；Key 绝不写入仓库或结果 URL。
$env:TMDB_API_KEY = '<your-key>'
npm run research:benchmark -- --provider tmdb --limit 10
```

探测脚本使用固定的 `naruto` / `siteinfo` 请求和研究 User-Agent，不发送昵称、短评、
上传图片或用户搜索词。基准脚本按顺序请求，并默认间隔 900ms，避免把评测变成高频抓取。

## 大陆可用性验收

HTTP 探测只能说明本机此刻能否建立连接，**不能证明中国大陆可用**。每个候选至少需要：

| 运营商 | 省份 | 浏览器测试时间 | 动画搜索 | 角色搜索 | 封面可加载/可绘制 | 证据链接或截图 | 结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 中国电信 | 待填 | 待填 | 待填 | 待填 | 待填 | 待填 | 待填 |
| 中国联通 | 待填 | 待填 | 待填 | 待填 | 待填 | 待填 | 待填 |
| 中国移动 | 待填 | 待填 | 待填 | 待填 | 待填 | 待填 | 待填 |

只有其中至少两家、且均完成搜索与 Canvas 图片验证，评分表才允许写为“大陆可用”。一条
运营商、服务器探测、VPN、海外节点或 DNS 成功都只能写为“未验证”。

本次 AniList 的低频烟测结果已提交为
[`research/results/2026-08-14-anilist-smoke.json`](../research/results/2026-08-14-anilist-smoke.json)：
前 8 条动画命中 5 条，抽取的 2 条角色命中 1 条，且两次均没有请求错误。这只证明当前网络
上的查询代码能运行，并直接暴露了中文检索覆盖仍需完整基准验证；它不是 100 条得分，更不是
大陆可用性结论。

## 当前机器可读评分表

[`research/provider-scorecard.json`](../research/provider-scorecard.json) 保存截至 2026-08-14
的单网络 HTTP 样本：Archive、AniList、萌娘百科与 `bangumi-data` 本次可建立连接，Bilibili
非公开搜索返回 412；TMDB 本次为网络错误，Jikan 本次为 504，Anime Offline Database 改用
Release 元数据端点后本次仍为网络错误。每一项的 `mainlandStatus` 都是 `unverified` / 未验证，不能作为
上线依据。

| 候选 | 层级 | 动画 / 角色 / 关联 / 图片 | 中文 | 认证与运行约束 | 当前判断 |
| --- | --- | --- | --- | --- | --- |
| Bangumi Archive / API | 官方基准 | 完整 / 完整 / 完整 / 可用 | 强 | 归档适合非实时；API 须遵守官方范围 | 可作离线基准，不是直连替代 |
| AniList GraphQL | 官方 | 完整 / 完整 / 完整 / 可用 | 部分 | 公共查询无需 Token；须遵守动态限流 | 可替换候选，等待 100 条与三网验证 |
| TMDB API | 官方 | 部分 / 不适用 / 部分 / 可用 | 强 | 需要 API Key；非商业需署名 | 仅作品/海报补充，不可覆盖角色题 |
| Jikan | 社区 | 完整 / 完整 / 完整 / 可用 | 部分 | 非官方 MyAnimeList 抓取 API | 仅研究，不作为默认生产源 |
| 萌娘百科 MediaWiki API | 社区 | 部分 / 部分 / 部分 / 部分 | 强 | 目录与字段不统一；非商业/署名条件须逐项核验 | 仅中文补充候选 |
| `bangumi-data` | 社区静态数据 | 部分 / 无 / 无 / 部分 | 部分 | CC BY 4.0，需署名 | 仅静态作品/别名补充 |
| Anime Offline Database | 社区静态数据 | 可用 / 无 / 无 / 部分 | 部分 | 数据集许可证及图片上游须在导入前复核 | 仅作品/别名补充 |
| Bilibili 非公开 Web 搜索 | 排除 | 不稳定 / 无 / 无 / 不稳定 | 强 | 当前样本 412，非公开元数据 API | 不可使用 |

“完整/部分”是接口能力初评，尚非 100 条覆盖率结果。实际命中率、封面覆盖率、CORS/Canvas
结果和错误率均由基准脚本输出；只有完整 100 条和三网实测结束后，才可更新为最终分数。

## 来源与许可核验清单

- [Bangumi Archive](https://github.com/bangumi/Archive) 说明其定期导出用途、条目、角色和
  条目—角色关联；其 `aux/latest.json` 用于查找最新归档。
- [Bangumi 版权与开发者平台规则](https://bgm.tv/about/copyright) 要求仅在 API 范围内取用，
  并说明条目/角色内容的版权边界。
- [AniList GraphQL 文档](https://docs.anilist.co/guide/graphql/) 规定公开 GraphQL 请求的
  POST 端点；[限流文档](https://docs.anilist.co/guide/rate-limiting) 记录当前临时 30 RPM
  限制和通常 90 RPM 的规则。
- [TMDB FAQ](https://developer.themoviedb.org/docs/faq) 说明 API Key 获取、非商业免费条件与
  必须在 About/Credits 中署名的要求。
- [Jikan 项目说明](https://github.com/jikan-me/jikan-rest) 自称为非官方的 MyAnimeList REST API；
  因而不作为默认生产来源。
- [`bangumi-data`](https://github.com/bangumi-data/bangumi-data) 提供静态数据/CDN，并将数据
  标为 CC BY 4.0。
- [Anime Offline Database](https://github.com/ipkpjersi/anime-offline-database) 提供作品、别名、
  图片地址和上游交叉引用，但不提供角色数据库；其发布数据会声明数据集许可证。

## 进入产品前的门槛

只有同时满足以下条件，才创建单独的实现 PR / 分支，而不是直接更换站点数据源：

1. 100 条测试集的结果、失败项和命中规则均可复现；
2. 至少两家独立中国大陆运营商通过浏览器搜索和 Canvas 图片测试；
3. 动画、角色、关联、封面、中文字段、限流和许可都已记录；
4. 若使用组合来源，界面可清楚标注每条数据/图片的来源与署名；海报不写入来源信息；
5. 不引入用户数据上传、账号、代理转发或秘密 Token 到浏览器端。

在上述条件成立前，最终结论是：**Bangumi 不可被替换；AniList 仅为首选验证候选；
TMDB、萌娘百科、`bangumi-data` 与 Anime Offline Database 仅可作为补充研究对象；Jikan 与
Bilibili 非公开接口不可用于生产主数据源。**
