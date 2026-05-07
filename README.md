# Game Sheets

A Progressive Web App for tracking scores in board and card games.

## Features

- 🎮 **Multiple Games**: Phase 10, Kniffel (Standard & Extrem)
- 📱 **PWA Support**: Install as standalone app, works offline
- 🌍 **Multilingual**: English and German support
- 💾 **Local Storage**: All game data saved in browser
- 🔄 **Auto Updates**: Notifies when new version is available
- 🎨 **Modern UI**: Built with Nuxt UI and Tailwind CSS

## PWA Features

This app is a full Progressive Web App (PWA) with:

- ✅ **Offline Support** - Works without internet connection
- ✅ **Installable** - Add to home screen on mobile/desktop
- ✅ **Auto Updates** - Checks for updates every hour
- ✅ **Update Notifications** - Users are notified when new version is available
- ✅ **Asset Caching** - All resources cached for fast loading

### Installing on Your Device

#### Mobile (iOS/Android)
1. Open the app in your browser (Safari/Chrome)
2. Tap the share button / menu (⋮)
3. Select "Add to Home Screen"
4. The app will appear as a standalone app icon

#### Desktop (Chrome/Edge)
1. Open the app in your browser
2. Look for the install icon in the address bar
3. Click "Install" to add to your applications

### How Updates Work

The app automatically checks for updates every hour when online. When a new version is available:

1. A notification appears at the bottom of the screen
2. Click "Update Now" to install the new version
3. The page refreshes with the latest features
4. Or click "Later" to update next time

All your game data is preserved during updates!

## Quick Start

```bash [Terminal]
npm create nuxt@latest -- -t ui
```

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-name=starter&repository-url=https%3A%2F%2Fgithub.com%2Fnuxt-ui-templates%2Fstarter&demo-image=https%3A%2F%2Fui.nuxt.com%2Fassets%2Ftemplates%2Fnuxt%2Fstarter-dark.png&demo-url=https%3A%2F%2Fstarter-template.nuxt.dev%2F&demo-title=Nuxt%20Starter%20Template&demo-description=A%20minimal%20template%20to%20get%20started%20with%20Nuxt%20UI.)

## Setup

Make sure to install the dependencies:

```bash
pnpm install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production

Build the application for production:

```bash
pnpm build
```

Locally preview production build:

```bash
pnpm preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Renovate integration

Install [Renovate GitHub app](https://github.com/apps/renovate/installations/select_target) on your repository and you are good to go.
