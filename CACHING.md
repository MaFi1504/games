# PWA Caching Strategy

## How Caching Works

Your Game Sheets app uses a sophisticated caching strategy to provide offline functionality:

### 1. **Precaching (Install Phase)**
When the app is first loaded or updated, the service worker caches:
- All JavaScript bundles
- CSS stylesheets
- HTML pages
- Images (PNG, SVG, ICO)
- App icons

**What this means:** After first load, the entire app works offline!

### 2. **Runtime Caching**
Some resources are cached on-demand as you use the app:

#### Google Fonts (if used)
- **Strategy:** Cache First
- **Duration:** 1 year
- **What this means:** Fonts are cached forever after first load

### 3. **Local Storage**
Game data is stored separately in browser's localStorage:
- Phase 10 game state
- Kniffel game state
- User preferences (language, theme)

**Important:** This data is separate from the service worker cache and persists even if you clear the cache.

## Update Strategy

### Automatic Updates (`registerType: 'autoUpdate'`)
- Service worker automatically updates in the background
- New version activates immediately after download
- Users are notified via update prompt
- Can choose to refresh now or later

### Update Check Frequency
- **Automatic:** Every hour while app is open
- **Manual:** When user navigates to the app
- **On focus:** When browser tab regains focus

## Offline Behavior

When offline:
✅ **Full app functionality** - All pages load normally
✅ **Game data** - Read and write to localStorage
✅ **Navigation** - Switch between games
✅ **Settings** - Change language and theme

When back online:
🔄 **Update check** - Automatically checks for new version
🔄 **Cache refresh** - Updates cached resources

## Cache Management

### Automatic Cleanup
- Old caches are automatically removed on update
- `cleanupOutdatedCaches: true` in configuration

### Manual Cache Clear
If you need to force a fresh install:

1. **Chrome/Edge DevTools:**
   - Application tab → Clear storage
   - Check "Unregister service workers"
   - Click "Clear site data"

2. **Firefox DevTools:**
   - Storage tab → Service Workers
   - Click "Unregister"

3. **Safari:**
   - Develop menu → Empty Caches

Then reload the page for a fresh install.

## Storage Estimates

Typical cache sizes:
- **App Code:** ~500KB - 2MB
- **Assets:** ~100KB - 500KB
- **Game Data:** ~1KB - 10KB per game

Total: Usually under 3MB

## Troubleshooting

### App Not Updating?
1. Check browser DevTools console for service worker errors
2. Ensure HTTPS is enabled (required for PWA)
3. Try force refresh (Ctrl+Shift+R / Cmd+Shift+R)
4. Clear cache and reload

### Offline Not Working?
1. Verify service worker is registered (DevTools → Application tab)
2. Check cache storage has content
3. Ensure you loaded the app at least once while online

### Update Notification Not Showing?
1. Wait up to 1 hour for automatic check
2. Close and reopen the app to trigger check
3. Verify new version is actually deployed

## Development vs Production

### Development Mode
- Service worker runs even in dev mode
- Updates apply immediately
- Useful for testing PWA features

### Production Mode
- Optimized bundles
- Longer cache times
- More aggressive caching

## Best Practices

1. **Always test offline mode** before deploying updates
2. **Version your app** to track what users have installed
3. **Monitor service worker** status in production
4. **Graceful degradation** if service worker fails
5. **Clear old caches** when making breaking changes
