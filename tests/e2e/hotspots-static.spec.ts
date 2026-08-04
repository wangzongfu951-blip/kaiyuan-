import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from 'playwright/test'

const fullData = JSON.parse(fs.readFileSync(path.resolve('public/data/hotspots-full.json'), 'utf8'))
const searchTerm = fullData.rows[0].hotTerm as string

test.describe('静态热点词页面', () => {
  test('图片模板默认展示并能展开五类解释', async ({ page }) => {
    await page.goto('/hotspots')
    await expect(page.getByTestId('hotspot-preset-image')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('header')).toContainText('66 条')
    await expect(page.locator('.hotspot-line')).toHaveCount(40)
    await expect(page.locator('.hotspot-line').first()).toContainText('城乡联动发展')
    await expect(page.locator('.hotspot-term').first()).toHaveText('城乡联动')

    await page.locator('.hotspot-line-button').first().click()
    await expect(page.getByTestId('hotspot-detail')).toContainText('词义')
    await expect(page.getByTestId('hotspot-detail')).toContainText('用法与语境')
    await expect(page.getByTestId('hotspot-detail')).toContainText('示例')
    await expect(page.getByTestId('hotspot-detail')).toContainText('考场用法')
    await expect(page.getByTestId('hotspot-detail')).toContainText('常见误用')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('年份')
    expect(bodyText).not.toContain('来源')
    await page.screenshot({ path: 'docs/qa/hotspots/hotspot-mobile.png' })
  })

  test('完整词库支持切换、搜索、主题筛选和加载更多', async ({ page }) => {
    await page.goto('/hotspots')
    await page.getByTestId('hotspot-preset-full').click()
    await expect(page.getByTestId('hotspot-preset-full')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('header')).toContainText('667 条')
    await expect(page.getByRole('button', { name: '全部主题' })).toBeVisible()
    await expect(page.locator('.hotspot-line')).toHaveCount(40)

    await page.locator('#hotspot-search').fill(searchTerm)
    await expect(page.locator('.hotspot-line').first()).toBeVisible()
    expect(await page.locator('.hotspot-line').count()).toBeGreaterThan(0)

    await page.locator('#hotspot-search').fill('')
    await page.locator('[aria-label="按主题筛选"] button').nth(1).click()
    await expect(page.locator('header')).not.toContainText('667 条')
    await page.locator('[aria-label="按主题筛选"] button').first().click()
    await expect(page.getByRole('button', { name: /加载更多/ })).toBeVisible()
    await page.getByRole('button', { name: /加载更多/ }).click()
    await expect(page.locator('.hotspot-line')).toHaveCount(80)

    await page.screenshot({ path: 'docs/qa/hotspots/hotspot-full-library.png' })
  })
})
