# PNGrab

Right-click any image and save it as a PNG.

## Overview

PNGrab is a Chrome Extension that lets you convert any image on a webpage to PNG format via the context menu. No broad host permissions are required — access is granted only on your explicit click via the `activeTab` permission.

## Features

- Right-click any image → **"Save as PNG"**
- Converts JPEG, WebP, GIF, AVIF, BMP, SVG, ICO to PNG
- Local processing — images are converted client-side
- Downloads with a sensible filename based on the image URL
- No data leaves your machine

## Permissions

| Permission | Why it's needed |
|---|---|
| `contextMenus` | Adds the "Save as PNG" item to the image context menu |
| `downloads` | Saves the converted PNG to your downloads folder |
| `storage` | Remembers the last saved image details |
| `activeTab` | Temporary access to the current tab on your explicit click, so the extension can inject a content script without broad host permissions |
| `scripting` | Injects the content script into the active tab to fetch, decode, and re-encode the image as PNG |

## Usage

1. Install the extension from the Chrome Web Store.
2. Right-click any image on a webpage.
3. Select **"Save as PNG"**.
4. Choose where to save the converted PNG file.

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Generate icons
npm run icons
```

## Project Structure

```
public/               # Extension assets (manifest, scripts, icons, fonts)
  manifest.json       # Chrome Extension manifest v3
  background.js       # Service worker — context menu + conversion logic
  content.js          # Content script — fetches and converts the image
src/                  # Popup UI (React + Vite)
dist/                 # Build output
```

## License

MIT