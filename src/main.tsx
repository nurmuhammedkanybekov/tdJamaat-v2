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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker();
