import { expect, test } from '@nuxt/test-utils/playwright'

test('home page renders app title', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await expect(page).toHaveTitle(/Games/)
})
