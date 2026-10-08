# Weavo desktop

Electron shell: tray icon, starts with Windows, keeps Weavo running in the background and
opens a big always-on-top reminder window when a reminder comes due. It loads the deployed
Weavo (https://vorlis08.github.io/weavo/), so `npm run deploy` updates the desktop app too.

- `npm install` then `npm start` — run it (set `WEAVO_URL=http://localhost:5173` to use the dev server)
- `npm run dist` — builds the installer to `C:/weavo-release` (outside OneDrive, which locks the folder)
- `npm run icon` — regenerates `icon.png` from `public/favicon.svg`
