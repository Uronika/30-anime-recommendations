import { expect, test } from '@playwright/test'

test('opens the first day and exposes archive controls', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '把动画记忆，整理成一张档案。' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '第一部动画' })).toBeVisible()
  await expect(page.getByRole('button', { name: '下载 5×6 PNG' })).toBeVisible()
})
