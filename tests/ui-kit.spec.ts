import { expect, test } from '@playwright/test'
import { kitSections } from '../src/ui/kit/sections'

const anchors = kitSections.map((section) => section.id)

test.beforeEach(async ({ page }) => {
  await page.goto('/dev/ui-kit?motion=off&clock=frozen&width=1120')
})

for (const id of anchors) {
  test(`screenshots the ${id} anchor`, async ({ page }) => {
    if (id === 'tokens') await expect(page.getByText('--fg-1 on --bg-1')).toBeVisible()
    await expect(page.locator(`#${id}`)).toHaveScreenshot(`${id}.png`)
  })
}

test('toolbar sets motion, clock, and width', async ({ page }) => {
  await page.goto('/dev/ui-kit')
  const stage = page.locator('[data-kit-stage]')
  await expect(stage).toHaveAttribute('data-width', '1120')
  await expect(stage).toHaveAttribute('data-motion', 'on')
  await expect(stage).toHaveAttribute('data-clock', 'live')
  await expect(page.getByTestId('kit-shimmer')).not.toHaveCSS('animation-name', 'none')

  await page.getByRole('button', { name: '800' }).click()
  await expect(stage).toHaveAttribute('data-width', '800')
  await expect(stage).toHaveCSS('width', '800px')

  await page.getByRole('button', { name: '1120' }).click()
  await expect(stage).toHaveCSS('width', '1120px')

  await page.getByRole('button', { name: 'Reduced motion' }).click()
  await expect(stage).toHaveAttribute('data-motion', 'off')
  await expect(page.getByTestId('kit-shimmer')).toHaveCSS('animation-name', 'none')
  await expect(page.getByTestId('kit-marker')).toHaveAttribute('data-marker', 'end')
  await expect(page.getByTestId('kit-check')).toHaveAttribute('data-drawn', 'true')

  await page.getByRole('button', { name: 'Freeze clock' }).click()
  await expect(stage).toHaveAttribute('data-clock', 'frozen')
  await expect(stage).toHaveAttribute('data-frozen-at', '2026-04-02T18:00:00.000Z')
  await expect(page.getByTestId('kit-countdown')).toHaveText('58:12')
})

test('prefers-reduced-motion stops shimmer, marker travel, and the check draw', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/dev/ui-kit')
  await expect(page.getByTestId('kit-shimmer')).toHaveCSS('animation-name', 'none')
  await expect(page.getByTestId('kit-marker')).toHaveAttribute('data-marker', 'end')
  await expect(page.getByTestId('kit-check')).toHaveAttribute('data-drawn', 'true')
  const atEnd = await page.getByTestId('kit-marker').evaluate((track) => {
    const bar = track.firstElementChild
    if (!bar) return false
    const trackBox = track.getBoundingClientRect()
    const barBox = bar.getBoundingClientRect()
    return barBox.left >= trackBox.left + trackBox.width / 2 - 2
  })
  expect(atEnd).toBe(true)
})

test('button focus and the discard dialog keyboard', async ({ page }) => {
  const primary = page.getByTestId('kit-primary')
  await primary.focus()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(primary).toBeFocused()
  await expect(primary).toHaveCSS('outline-style', 'solid')

  await page.getByRole('button', { name: 'Open discard dialog' }).click()
  const dialog = page.getByRole('dialog', { name: 'Discard this draft?' })
  await expect(dialog.getByRole('button', { name: 'Discard draft' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Discard draft' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('nav reaches each section', async ({ page }) => {
  await page.goto('/dev/ui-kit')
  for (const section of kitSections) {
    await page.getByRole('link', { name: section.title }).click()
    await expect(page.locator(`#${section.id}`)).toBeInViewport()
  }
})
