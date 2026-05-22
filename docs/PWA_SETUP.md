# PWA Icon Generation

## Quick Setup

The app needs icon files for PWA installation. You have two options:

### Option 1: Using the SVG Icon (Automatic)

If you have ImageMagick installed, run:

```bash
# Install ImageMagick if needed
# Ubuntu/Debian: sudo apt-get install imagemagick
# macOS: brew install imagemagick

# Generate all icons from SVG
cd public
convert icon.svg -resize 192x192 icon-192.png
convert icon.svg -resize 512x512 icon-512.png
convert icon.svg -resize 192x192 icon-maskable-192.png
convert icon.svg -resize 512x512 icon-maskable-512.png
```

### Option 2: Use Your Own Icons

Replace the files in the `public/` directory:
- `icon-192.png` - 192x192px app icon
- `icon-512.png` - 512x512px app icon
- `icon-maskable-192.png` - 192x192px maskable icon (with safe zone)
- `icon-maskable-512.png` - 512x512px maskable icon (with safe zone)

For maskable icons, ensure important content is within the center 80% of the image (safe zone).

### Option 3: Online Icon Generator

Use a service like:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

Upload your base icon and download all required sizes.

## PWA Features Enabled

✅ **Offline Support** - App caches all assets for offline use
✅ **Auto Updates** - Checks for updates every hour
✅ **Install Prompt** - Can be installed as standalone app
✅ **Update Notifications** - Users are notified when new version is available

## Testing PWA Locally

1. Build the app: `pnpm build`
2. Preview: `pnpm preview`
3. Open in browser and check:
   - Application tab in DevTools
   - Service Worker registered
   - Cache storage populated
   - Install button appears

## Testing on Mobile

1. Deploy the app to a server with HTTPS
2. Open on your phone
3. Browser will show "Add to Home Screen" prompt
4. Install and test offline functionality
