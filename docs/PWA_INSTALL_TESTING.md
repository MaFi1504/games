# PWA Install Icon - Testing Guide

## Why the Install Icon Doesn't Appear in Dev Mode

The browser install icon/prompt has strict requirements:

### Requirements for Install Icon:
1. ✅ **Valid manifest** with required fields
2. ✅ **Service worker** registered
3. ✅ **Icons** (192px and 512px minimum)
4. ⚠️ **HTTPS** (or localhost)
5. ⚠️ **Production build** (dev mode may not trigger it)
6. ⚠️ **Engagement signals** (user has visited site before)

## Testing the Install Functionality

### Option 1: Production Build (Recommended)

```bash
# Build for production
pnpm build

# Preview the production build
pnpm preview
```

Then open `http://localhost:3000` in Chrome and:
1. Look for install icon in address bar (⊕ or ⬇️ icon)
2. Or go to Chrome menu → "Install Game Sheets..."
3. Or check DevTools → Application → Manifest

### Option 2: Manual Install (Development)

Even without the automatic install prompt, you can manually install:

**Chrome Desktop:**
1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Manifest" in sidebar
4. Click "Add to home screen" link at top
5. Or use the "Install" button if available

**Chrome Mobile:**
1. Open browser menu (⋮)
2. Select "Install app" or "Add to Home Screen"

### Option 3: Deploy to HTTPS

PWA features work best when deployed to a real HTTPS server:

```bash
# Build
pnpm build

# Deploy to your server or use a service like:
# - Vercel: vercel deploy
# - Netlify: netlify deploy
# - Your own HTTPS server
```

## Checking PWA Status

### In Chrome DevTools:

1. **Application → Manifest**
   - Should show all icons
   - Name, colors, display mode

2. **Application → Service Workers**
   - Should show "Activated and running"
   - Status: Active

3. **Lighthouse**
   - Run PWA audit
   - Should pass all PWA checks

### Common Issues:

**"No matching service worker detected"**
→ Build and preview in production mode

**"Not served over HTTPS"**
→ Use production preview or deploy to HTTPS server

**"User has not engaged with the page"**
→ Navigate around the app, wait a few seconds

**"Page does not meet the service worker for installability requirements"**
→ Build for production, dev mode may not count

## Current Setup Status

Your app is configured correctly with:
- ✅ Valid manifest with icons
- ✅ Service worker configured
- ✅ Auto-update system
- ✅ Offline support

The install icon **will appear** when you build and preview in production mode!

## Quick Test Command

```bash
# One command to test everything
pnpm build && pnpm preview
```

Then open in Chrome and check the address bar for the install icon.
