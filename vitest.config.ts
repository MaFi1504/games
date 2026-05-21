import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

// pnpm's strict hoisting means the Vue package lives in a version-specific
// subdirectory instead of node_modules/vue. Resolving it at runtime avoids
// a hardcoded path that breaks on every Vue version bump.
const require = createRequire(import.meta.url)
const vuePath = require.resolve('vue')

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            vue: vuePath
          }
        },
        test: {
          name: 'unit',
          include: ['test/unit/*.{test,spec}.ts'],
          environment: 'node'
        }
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/*.{test,spec}.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              rootDir: fileURLToPath(new URL('.', import.meta.url)),
              domEnvironment: 'happy-dom'
            }
          }
        }
      })
    ]
  }
})
