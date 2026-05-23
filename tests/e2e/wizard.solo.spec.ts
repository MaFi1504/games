import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('Wizard sheet – solo', () => {
  test.beforeEach(async ({ goto }) => {
    await goto('/sheets/wizard', { waitUntil: 'hydration' })
  })

  test('setup form requires at least two players', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Start game' })).toBeDisabled()

    await page.getByPlaceholder('Player name').fill('Alice')
    await page.getByRole('button', { name: 'Add player' }).click()

    // Still disabled with only one player
    await expect(page.getByRole('button', { name: 'Start game' })).toBeDisabled()

    await page.getByPlaceholder('Player name').fill('Bob')
    await page.getByRole('button', { name: 'Add player' }).click()

    await expect(page.getByRole('button', { name: 'Start game' })).toBeEnabled()
  })

  test('full round: correct bids earn positive points', async ({ page }) => {
    // Add players
    await page.getByPlaceholder('Player name').fill('Alice')
    await page.getByRole('button', { name: 'Add player' }).click()
    await page.getByPlaceholder('Player name').fill('Bob')
    await page.getByRole('button', { name: 'Add player' }).click()
    await page.getByRole('button', { name: 'Start game' }).click()

    // Round 1 is added automatically; bid inputs visible
    await expect(page.getByPlaceholder('Bid').first()).toBeVisible()

    // Enter and lock bids (Alice: 2, Bob: 1)
    await page.getByPlaceholder('Bid').nth(0).fill('2')
    await page.getByPlaceholder('Bid').nth(1).fill('1')
    await page.getByRole('button', { name: 'Lock bid' }).nth(0).click()
    await page.getByRole('button', { name: 'Lock bid' }).nth(1).click()

    // Tricks inputs appear after all bids are locked
    await expect(page.getByPlaceholder('Won').first()).toBeVisible()

    // Enter tricks matching bids → both correct
    await page.getByPlaceholder('Won').nth(0).fill('2') // Alice: bid 2, tricks 2 → +40
    await page.getByPlaceholder('Won').nth(1).fill('1') // Bob:   bid 1, tricks 1 → +30

    await expect(page.getByText('+40')).toBeVisible()
    await expect(page.getByText('+30')).toBeVisible()

    // Totals row
    await expect(page.getByText('40').first()).toBeVisible()
    await expect(page.getByText('30').first()).toBeVisible()
  })

  test('wrong bid produces negative points', async ({ page }) => {
    await page.getByPlaceholder('Player name').fill('Alice')
    await page.getByRole('button', { name: 'Add player' }).click()
    await page.getByPlaceholder('Player name').fill('Bob')
    await page.getByRole('button', { name: 'Add player' }).click()
    await page.getByRole('button', { name: 'Start game' }).click()

    await expect(page.getByPlaceholder('Bid').first()).toBeVisible()

    // Alice bid 3, tricks 1 → wrong by 2 → -20
    await page.getByPlaceholder('Bid').nth(0).fill('3')
    await page.getByPlaceholder('Bid').nth(1).fill('0')
    await page.getByRole('button', { name: 'Lock bid' }).nth(0).click()
    await page.getByRole('button', { name: 'Lock bid' }).nth(1).click()

    await page.getByPlaceholder('Won').nth(0).fill('1') // Alice: bid 3, tricks 1 → -20
    await page.getByPlaceholder('Won').nth(1).fill('0') // Bob:   bid 0, tricks 0 → +20

    await expect(page.getByText('-20')).toBeVisible()
    await expect(page.getByText('+20')).toBeVisible()
  })

  test('next round becomes available after all tricks are entered', async ({ page }) => {
    await page.getByPlaceholder('Player name').fill('Alice')
    await page.getByRole('button', { name: 'Add player' }).click()
    await page.getByPlaceholder('Player name').fill('Bob')
    await page.getByRole('button', { name: 'Add player' }).click()
    await page.getByRole('button', { name: 'Start game' }).click()

    // "Next round" is disabled until tricks are filled
    await expect(page.getByRole('button', { name: 'Next round' })).toBeDisabled()

    await page.getByPlaceholder('Bid').nth(0).fill('1')
    await page.getByPlaceholder('Bid').nth(1).fill('1')
    await page.getByRole('button', { name: 'Lock bid' }).nth(0).click()
    await page.getByRole('button', { name: 'Lock bid' }).nth(1).click()

    // Still disabled until tricks are entered
    await expect(page.getByRole('button', { name: 'Next round' })).toBeDisabled()

    await page.getByPlaceholder('Won').nth(0).fill('1')
    await page.getByPlaceholder('Won').nth(1).fill('1')

    await expect(page.getByRole('button', { name: 'Next round' })).toBeEnabled()
    await page.getByRole('button', { name: 'Next round' }).click()

    // Round 2 bid inputs now visible
    await expect(page.getByPlaceholder('Bid').first()).toBeVisible()
  })

  test('reset clears the game and returns to setup', async ({ page }) => {
    await page.getByPlaceholder('Player name').fill('Alice')
    await page.getByRole('button', { name: 'Add player' }).click()
    await page.getByPlaceholder('Player name').fill('Bob')
    await page.getByRole('button', { name: 'Add player' }).click()
    await page.getByRole('button', { name: 'Start game' }).click()

    await expect(page.getByPlaceholder('Bid').first()).toBeVisible()

    // Open reset modal and confirm
    await page.getByRole('button', { name: 'Reset game' }).click()
    await page.getByRole('button', { name: 'Reset' }).last().click()

    // Back to setup screen
    await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible()
    await expect(page.getByPlaceholder('Bid')).not.toBeVisible()
  })
})
