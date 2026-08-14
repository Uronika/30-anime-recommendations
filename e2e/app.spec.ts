import { expect, test, type Page } from '@playwright/test'

async function routeSmallArchive(page: Page) {
  await page.route('**/archive-data/manifest.json', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    await route.fulfill({ json: {
    schemaVersion: 1,
    snapshot: { name: 'dump-2026-08-11.210343Z.zip' },
    recordCounts: { subjects: 1, characters: 0 },
    files: { searchDirectory: 'search', searchShardCount: 1, detailsDirectory: 'details', detailShardCount: 1 },
    } })
  })
  await page.route('**/archive-data/search/0.json', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250))
    await route.fulfill({ json: {
    schemaVersion: 1, snapshot: 'dump-2026-08-11.210343Z.zip', entries: [{
      id: 42, kind: 'subject', subjectType: 'anime', name: '火影忍者', originalName: 'NARUTO', aliases: ['Naruto'], nsfw: false, popularity: 100,
      forms: { text: ['火影忍者', 'naruto'], pinyin: ['huoyingrenzhe', 'hyrz'] },
    }],
    } })
  })
  await page.route('**/archive-data/details/0.json', (route) => route.fulfill({ json: { subjects: { '42': { id: 42, kind: 'subject', summary: '测试简介', relatedCharacterIds: [] } }, characters: {} } }))
}

test('opens the first day and chooses a static Archive item with cover reflow', async ({ page }) => {
  await routeSmallArchive(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '把动画记忆，整理成一张档案。' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '第一部动画' })).toBeVisible()
  await page.getByLabel('搜索动画、作品或角色').fill('火影')
  await expect(page.getByText('正在准备离线资料库…')).toBeVisible()
  await expect(page.getByRole('button', { name: /火影忍者/ })).toBeVisible()
  await expect(page.getByText(/Archive 快照/)).toBeVisible()
  await page.getByRole('button', { name: /火影忍者/ }).click()
  await expect(page.getByText('已选择 · 动画')).toBeVisible()
  await expect(page.locator('.selected-item')).toHaveClass(/without-cover/)
  await page.getByRole('checkbox', { name: /显示封面图片/ }).check()
  await expect(page.locator('.selected-item')).toHaveClass(/with-cover/)
  await expect(page.getByText('动画', { exact: true }).last()).toBeVisible()
})

test('can bypass the offline Archive index and search the official API directly', async ({ page }) => {
  let archiveRequests = 0
  await page.route('**/archive-data/**', (route) => { archiveRequests += 1; return route.abort() })
  await page.route('https://30-anime-recommendations-image-proxy.30-anime-recommendation.workers.dev/image/subject/7?type=large', (route) => route.fulfill({
    contentType: 'image/svg+xml',
    headers: { 'Access-Control-Allow-Origin': '*', 'Cross-Origin-Resource-Policy': 'cross-origin' },
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="120"><rect width="80" height="120" fill="#365e3b"/></svg>',
  }))
  await page.route('https://api.bgm.tv/v0/search/subjects?limit=20', (route) => route.fulfill({ json: { data: [{ id: 7, type: 2, name: 'NARUTO', name_cn: '火影忍者', collection_total: 100, images: { large: 'https://images.example.test/naruto.svg' } }] } }))
  await page.route('https://api.bgm.tv/v0/search/characters?limit=20', (route) => route.fulfill({ json: { data: [] } }))
  await page.goto('/')
  await page.getByRole('checkbox', { name: /直接使用 Bangumi 官方 API/ }).check()
  await page.getByRole('checkbox', { name: /显示封面图片/ }).check()
  await page.getByLabel('搜索动画、作品或角色').fill('火影忍者')
  await expect(page.getByRole('button', { name: /火影忍者/ })).toBeVisible()
  await expect(page.getByText('本次搜索未加载离线资料库。')).toBeVisible()
  await page.getByRole('button', { name: /火影忍者/ }).click()
  await expect(page.locator('.selected-item img')).toHaveAttribute('src', 'https://30-anime-recommendations-image-proxy.30-anime-recommendation.workers.dev/image/subject/7?type=large')
  await page.evaluate(() => {
    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage
    const sources: string[] = []
    Object.defineProperty(window, '__posterImageSources', { configurable: true, value: sources })
    CanvasRenderingContext2D.prototype.drawImage = function (...args: Parameters<CanvasRenderingContext2D['drawImage']>) {
      const image = args[0]
      if (image instanceof HTMLImageElement) sources.push(image.src)
      return originalDrawImage.apply(this, args)
    }
  })
  const [pngDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '下载 5×6 PNG' }).click()])
  expect(pngDownload.suggestedFilename()).toContain('30部动漫推荐')
  await expect.poll(() => page.evaluate(() => (window as Window & { __posterImageSources?: string[] }).__posterImageSources ?? [])).toContain('https://30-anime-recommendations-image-proxy.30-anime-recommendation.workers.dev/image/subject/7?type=large')
  expect(archiveRequests).toBe(0)
})

test('uses manual fallback when both static and official online search fail', async ({ page }) => {
  await page.route('**/archive-data/manifest.json', (route) => route.fulfill({ status: 503 }))
  await page.route('https://api.bgm.tv/**', (route) => route.fulfill({ status: 503 }))
  await page.goto('/')
  await page.getByLabel('搜索动画、作品或角色').fill('不存在')
  await expect(page.getByRole('alert')).toContainText('Bangumi 官方 API')
  await page.getByRole('button', { name: '没有找到？手工填写' }).click()
  await expect(page.getByLabel('名称')).toBeVisible()
})

test('imports a v1 legacy music backup and exports JSON plus a PNG', async ({ page }) => {
  await page.goto('/')
  const legacy = JSON.stringify({ version: 1, nickname: '旧档案', subtitle: '旧副标题', updatedAt: '2026-08-14T00:00:00.000Z', entries: [{ day: 28, comment: '旧版记录', selection: { source: 'music', title: 'Brave Shine', credit: 'Aimer', relatedSubject: { source: 'manual', name: 'Fate/stay night' } } }] })
  await page.locator('.backup-controls input[type=file]').setInputFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(legacy) })
  await page.getByRole('button', { name: 'D28' }).click()
  await expect(page.getByText('Brave Shine')).toBeVisible()
  await expect(page.getByText('旧版曲目记录')).toBeVisible()
  const [jsonDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '导出备份' }).click()])
  expect(jsonDownload.suggestedFilename()).toContain('30部动漫推荐-备份.json')
  const [pngDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '下载 5×6 PNG' }).click()])
  expect(pngDownload.suggestedFilename()).toContain('30部动漫推荐-')
})
