import { expect, test } from '@nuxt/test-utils/playwright'

// Multiplayer tests open two browser pages against the same Nuxt/Nitro server.
// The WebSocket server runs as part of the Nuxt dev server started by @nuxt/test-utils.
// Tests are serialised (no parallelism) to avoid port/room conflicts.
test.describe.configure({ mode: 'serial' })

test('multiplayer: two players connect, start game, and complete a round', async ({
  page,
  goto,
  browser
}) => {
  // ── Alice (page 1) ────────────────────────────────────────────────────────
  await goto('/sheets/wizard', { waitUntil: 'hydration' })
  const baseURL = new URL(page.url()).origin

  // Expand the "Play with others" panel and create a room
  await page.getByRole('button', { name: /Play with others/i }).click()
  await page.getByPlaceholder('Your name').fill('Alice')
  // Default mode is "Create room" — just click Connect
  await page.getByRole('button', { name: 'Connect' }).click()

  // Wait until Alice is connected and the room code is displayed
  await expect(page.getByText('Share this code with the other players:')).toBeVisible({
    timeout: 8000
  })
  const roomCode = (await page.locator('p.tracking-widest').textContent())?.trim()
  expect(roomCode).toMatch(/^[A-Z0-9]{4,10}$/)

  // ── Bob (page 2) ──────────────────────────────────────────────────────────
  const page2 = await browser.newPage()
  await page2.goto(`${baseURL}/sheets/wizard`)
  await page2.waitForLoadState('networkidle')

  await page2.getByRole('button', { name: /Play with others/i }).click()
  await page2.getByPlaceholder('Your name').fill('Bob')
  // Switch to "Join room" tab
  await page2.getByRole('button', { name: 'Join room' }).click()
  await page2.getByPlaceholder(/Room code/i).fill(roomCode!)
  await page2.getByRole('button', { name: 'Connect' }).click()

  // Bob should now be connected and see the room code
  await expect(page2.getByText('Share this code with the other players:')).toBeVisible({
    timeout: 8000
  })

  // ── Start game ────────────────────────────────────────────────────────────
  // Alice starts — both players auto-start (started broadcast)
  await page.getByRole('button', { name: 'Start game' }).click()

  // Both pages should show round 1 bid inputs
  await expect(page.getByPlaceholder('Bid').first()).toBeVisible({ timeout: 5000 })
  await expect(page2.getByPlaceholder('Bid').first()).toBeVisible({ timeout: 5000 })

  // ── Enter and lock bids ───────────────────────────────────────────────────
  // Each player enters and locks their own bid
  await page.getByPlaceholder('Bid').first().fill('2')
  await page.getByRole('button', { name: 'Lock bid' }).first().click()

  await page2.getByPlaceholder('Bid').first().fill('1')
  await page2.getByRole('button', { name: 'Lock bid' }).first().click()

  // After all bids are locked, tricks inputs appear on both pages
  await expect(page.getByPlaceholder('Won').first()).toBeVisible({ timeout: 5000 })
  await expect(page2.getByPlaceholder('Won').first()).toBeVisible({ timeout: 5000 })

  // ── Enter tricks ──────────────────────────────────────────────────────────
  // Alice: bid 2, tricks 2 → correct → +40
  await page.getByPlaceholder('Won').first().fill('2')
  // Bob:   bid 1, tricks 1 → correct → +30
  await page2.getByPlaceholder('Won').first().fill('1')

  // Scores visible on respective pages
  await expect(page.getByText('+40')).toBeVisible({ timeout: 3000 })
  await expect(page2.getByText('+30')).toBeVisible({ timeout: 3000 })

  await page2.close()
})

test('multiplayer: bids are hidden from other players until all are locked', async ({
  page,
  goto,
  browser
}) => {
  await goto('/sheets/wizard', { waitUntil: 'hydration' })
  const baseURL = new URL(page.url()).origin

  await page.getByRole('button', { name: /Play with others/i }).click()
  await page.getByPlaceholder('Your name').fill('Alice')
  await page.getByRole('button', { name: 'Connect' }).click()
  await expect(page.getByText('Share this code with the other players:')).toBeVisible({
    timeout: 8000
  })
  const roomCode = (await page.locator('p.tracking-widest').textContent())?.trim()

  const page2 = await browser.newPage()
  await page2.goto(`${baseURL}/sheets/wizard`)
  await page2.waitForLoadState('networkidle')
  await page2.getByRole('button', { name: /Play with others/i }).click()
  await page2.getByPlaceholder('Your name').fill('Bob')
  await page2.getByRole('button', { name: 'Join room' }).click()
  await page2.getByPlaceholder(/Room code/i).fill(roomCode!)
  await page2.getByRole('button', { name: 'Connect' }).click()
  await expect(page2.getByText('Share this code with the other players:')).toBeVisible({
    timeout: 8000
  })

  await page.getByRole('button', { name: 'Start game' }).click()
  await expect(page.getByPlaceholder('Bid').first()).toBeVisible({ timeout: 5000 })
  await expect(page2.getByPlaceholder('Bid').first()).toBeVisible({ timeout: 5000 })

  // Alice locks her bid — Bob should see the hidden-eye icon, not Alice's bid value
  await page.getByPlaceholder('Bid').first().fill('3')
  await page.getByRole('button', { name: 'Lock bid' }).first().click()

  // Bob's page: Alice's bid should be hidden (eye-off icon visible, bid number not)
  // The tricks input should NOT appear yet (Bob hasn't locked)
  await expect(page2.getByPlaceholder('Won')).not.toBeVisible()

  await page2.close()
})
