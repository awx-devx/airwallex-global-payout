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

test('width 800 keeps the table and stacks the stepper', async ({ page }) => {
  await page.goto('/dev/ui-kit?motion=off&clock=frozen&width=800')
  const stage = page.locator('[data-kit-stage]')
  await expect(stage).toHaveCSS('width', '800px')
  await expect(page.locator('#patterns table').first()).toBeVisible()
  await expect(page.locator('#payout table').first()).toBeVisible()
  await expect(page.locator('#payout article')).toHaveCount(0)
  const stacked = await page
    .locator('#payout ol')
    .first()
    .evaluate((list) => {
      return getComputedStyle(list).gridTemplateColumns.split(' ').length === 1
    })
  expect(stacked).toBe(true)
  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(pageOverflow).toBe(0)
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

test('payout kit shows the pay gate and the frozen review step', async ({ page }) => {
  const payout = page.locator('#payout')
  await expect(
    payout.getByTestId('paybar-run_ready').getByRole('button', { name: /^Pay / }),
  ).toHaveCount(0)
  await expect(payout.getByTestId('paybar-run_ready')).toContainText(
    'Exclude the rows with errors first.',
  )
  await expect(
    payout.getByTestId('paybar-run_ready_clean').getByRole('button', {
      name: 'Pay 6 contractors · USD 18,960.00',
    }),
  ).toBeVisible()
  await expect(payout.getByTestId('paybar-run_expired')).toContainText('Quote expired.')
  await expect(
    payout.getByTestId('paybar-run_expired').getByRole('button', { name: 'Refresh quote' }),
  ).toBeVisible()
  await expect(payout.getByTestId('paybar-run_short')).toContainText(
    'USD wallet is short by USD 18,860.00.',
  )
  await expect(payout.getByTestId('paybar-run_approval')).toContainText(
    'Waiting for approval in Airwallex. This demo cannot approve it.',
  )
  await expect(
    payout.getByTestId('paybar-run_inflight').getByRole('button', { name: 'Advance statuses' }),
  ).toBeVisible()
  await expect(payout.getByText('5 of 6 paid.')).toBeVisible()
  await expect(payout.getByText('postcode is required.').first()).toBeVisible()
  await expect(payout.getByText('Only rail').first()).toBeVisible()
  await expect(payout.getByRole('button', { name: 'Exclude' }).first()).toBeVisible()
  await expect(payout.getByTestId('payout-story')).toHaveText(
    'Cheapest rail is selected. Nothing has been paid.',
  )
  await expect(
    payout.getByTestId('payout-story-stepper').locator('[aria-current="step"]'),
  ).toHaveText(/Review/)
  await expect(payout.getByTestId('payout-countdown')).toHaveText('60:00')
  await expect(payout.getByTestId('payout-countdown-expired')).toHaveText('Expired')
})

test('patterns kit assembles the home and review screens', async ({ page }) => {
  const patterns = page.locator('#patterns')
  await expect(patterns.getByRole('link', { name: 'Global Payouts' }).first()).toBeVisible()
  await expect(patterns.getByText('Sandbox').first()).toBeVisible()
  await expect(patterns.getByText('Balance unavailable')).toBeVisible()
  await expect(patterns.getByRole('link', { name: 'Payouts', exact: true })).toBeVisible()
  await expect(patterns.getByRole('button', { name: 'Use the sample file' }).first()).toBeVisible()
  await expect(patterns.getByText('Upload a CSV with the contractor header.')).toBeVisible()
  await expect(patterns.getByText('A file can include at most 25 contractors.')).toBeVisible()
  await expect(patterns.getByText('No payouts yet')).toBeVisible()
  await expect(patterns.getByText('2 Apr 2026').first()).toBeVisible()

  const ready = patterns.getByTestId('pattern-run_ready')
  await expect(ready.getByText('Cheapest')).toHaveCount(5)
  await expect(ready.getByText('Only rail')).toBeVisible()
  await expect(ready.getByText('postcode is required.')).toBeVisible()
  await expect(ready.getByRole('button', { name: 'Exclude' })).toBeVisible()
  await expect(ready.getByRole('button', { name: /^Pay / })).toHaveCount(0)

  await expect(
    patterns.getByTestId('pattern-run_ready_clean').getByRole('button', {
      name: 'Pay 6 contractors · USD 18,960.00',
    }),
  ).toBeVisible()
  await expect(patterns.getByTestId('pattern-run_inflight')).toContainText('Booking each payout.')
  await expect(patterns.getByTestId('pattern-run_approval')).toContainText(
    'Waiting for approval in Airwallex.',
  )
  await expect(patterns.getByTestId('pattern-run_done')).toContainText('5 of 6 paid.')
  await expect(patterns.getByTestId('pattern-run_done')).toContainText(
    'The beneficiary bank rejected the payout.',
  )
  await expect(
    patterns.getByTestId('pattern-run_done').getByText('Paid with failures'),
  ).toBeVisible()
})

test('nav reaches each section', async ({ page }) => {
  await page.goto('/dev/ui-kit')
  for (const section of kitSections) {
    await page.getByRole('link', { name: section.title, exact: true }).click()
    await expect(page.locator(`#${section.id}`)).toBeInViewport()
  }
})
