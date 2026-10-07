import { expect, test } from '@playwright/test'

test('plays the payout script against the api', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('USD available 50,000.00')).toBeVisible()
  await expect(page.getByText('No payouts yet')).toBeVisible()

  await page.getByRole('button', { name: 'Use the sample file' }).click()
  await expect(page.getByText('Exclude the rows with errors before paying.')).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByText('Cheapest')).toHaveCount(5)
  await expect(page.getByText('Only rail')).toBeVisible()
  await expect(page.getByText('postcode is required.')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Pay / })).toHaveCount(0)

  await page.getByRole('button', { name: 'Exclude' }).click()
  const pay = page.getByRole('button', { name: 'Pay 6 contractors · USD 189.60' })
  await expect(pay).toBeVisible()
  await pay.click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Pay 6 contractors · USD 189.60' })
    .click()
  await expect(page.getByText('Booking each payout.')).toBeVisible()
  await expect(page.getByText('Ready')).toHaveCount(0)

  await page.getByRole('button', { name: 'Advance statuses' }).click()
  await expect(page.getByText('6 of 6 sent.')).toBeVisible()
  await page.getByRole('button', { name: 'Advance statuses' }).click()
  await expect(page.getByText('5 of 6 paid.')).toBeVisible()
  await expect(page.getByText('The beneficiary bank rejected the payout.')).toBeVisible()
  await expect(page.getByText('Paid with failures')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Advance statuses' })).toHaveCount(0)
})

test('a non-csv stays on the home page', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  })
  await expect(page.getByText('Upload a CSV with the contractor header.')).toBeVisible()
  await expect(page).toHaveURL('/')
})

test('an unknown payout shows the empty state', async ({ page }) => {
  await page.goto('/runs/missing')
  await expect(page.getByText('This payout does not exist')).toBeVisible()
  await page.getByRole('link', { name: 'Payouts' }).nth(1).click()
  await expect(page).toHaveURL('/')
})
