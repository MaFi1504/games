#!/bin/bash

# Script to generate PWA icons from SVG source

set -e

echo "🎨 Generating PWA icons..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed"
    echo "Install it with:"
    echo "  Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "  macOS: brew install imagemagick"
    exit 1
fi

# Change to public directory
cd "$(dirname "$0")/public"

if [ ! -f "icon.svg" ]; then
    echo "❌ icon.svg not found in public directory"
    exit 1
fi

echo "📱 Generating app icons..."
convert icon.svg -resize 192x192 -background none icon-192.png
convert icon.svg -resize 512x512 -background none icon-512.png

echo "🎭 Generating maskable icons..."
# For maskable icons, add padding to ensure safe zone
convert icon.svg -resize 384x384 -background none -gravity center -extent 512x512 icon-maskable-512.png
convert icon.svg -resize 154x154 -background none -gravity center -extent 192x192 icon-maskable-192.png

echo "✅ Icons generated successfully!"
echo "Generated files:"
ls -lh icon*.png

echo ""
echo "🚀 You can now build and deploy your PWA!"
