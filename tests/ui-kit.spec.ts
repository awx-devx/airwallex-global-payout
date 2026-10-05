import { expect, test } from '@playwright/test'
import { kitSections } from '../src/ui/kit/sections'

const anchors = kitSections.map((section) => section.id)

test.beforeEach(async ({ page }) => {
  await page.goto('/dev/ui-kit?motion=off&clock=frozen&width=1120')
})

for (const id of anchors) {
  test(`screenshots the ${id} anchor`, async ({ page }) => {
    await expect(page.locator(`#${id}`)).toHaveScreenshot(`${id}.png`)
  })
}

test('toolbar sets motion, clock, and width', async ({ page }) => {
  await page.goto('/dev/ui-kit')
  const stage = page.locator('[data-kit-stage]')
  await expect(stage).toHaveAttribute('data-width', '1120')
  await expect(stage).toHaveAttribute('data-motion', 'on')
  await expect(stage).toHaveAttribute('data-clock', 'live')

  await page.getByRole('button', { name: '800' }).click()
  await expect(stage).toHaveAttribute('data-width', '800')
  await expect(stage).toHaveCSS('width', '800px')

  await page.getByRole('button', { name: '1120' }).click()
  await expect(stage).toHaveCSS('width', '1120px')

  await page.getByRole('button', { name: 'Reduced motion' }).click()
  await expect(stage).toHaveAttribute('data-motion', 'off')

  await page.getByRole('button', { name: 'Freeze clock' }).click()
  await expect(stage).toHaveAttribute('data-clock', 'frozen')
  await expect(stage).toHaveAttribute('data-frozen-at', '2026-04-02T18:00:00.000Z')
})

test('nav reaches each section', async ({ page }) => {
  await page.goto('/dev/ui-kit')
  for (const section of kitSections) {
    await page.getByRole('link', { name: section.title }).click()
    await expect(page.locator(`#${section.id}`)).toBeInViewport()
  }
})
