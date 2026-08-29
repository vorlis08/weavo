// GitHub Pages has no SPA rewrite. Serving the app's index.html as 404.html
// makes deep links (e.g. /weavo/kanban) boot the SPA, which then routes client-side.
import { copyFileSync } from 'node:fs'

copyFileSync('dist/index.html', 'dist/404.html')
console.log('spa-fallback: wrote dist/404.html')
