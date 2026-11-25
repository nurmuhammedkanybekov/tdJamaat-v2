import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/prata/400.css'
import '@fontsource/spectral/300.css'
import '@fontsource/spectral/400.css'
import '@fontsource/spectral/400-italic.css'
import '@fontsource/spectral/500.css'
import '@fontsource/spectral/600.css'
import './index.css'
import App from './App.tsx'
import { initScreen, initTheme } from './theme'
import { registerServiceWorker } from './pwa'

initTheme();
initScreen();

// Back from a Google sign-in that failed (?error=…): keep the reason to show
// it, and clean the address.
try {
  const q = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const why = q.get('error_description') ?? h.get('error_description');
  if (why) {
    sessionStorage.setItem('tdjamaat-auth-error', why);
    window.history.replaceState(null, '', `${window.location.pathname}#/today`);
  }
} catch { /* not critical */ }

// Back from a Google sign-in (?code=…): open the page the member started from.
try {
  const after = sessionStorage.getItem('tdjamaat-after-login');
  if (after && new URLSearchParams(window.location.search).has('code')) {
    sessionStorage.removeItem('tdjamaat-after-login');
    if (!window.location.hash || window.location.hash === '#') window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${after}`);
  }
} catch { /* storage blocked: the start page is fine */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker();
