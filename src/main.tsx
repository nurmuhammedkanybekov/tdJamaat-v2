import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/oranienbaum/400.css'
import '@fontsource/spectral/300.css'
import '@fontsource/spectral/400.css'
import '@fontsource/spectral/400-italic.css'
import '@fontsource/spectral/500.css'
import './index.css'
import App from './App.tsx'
import { initTheme } from './theme'
import { registerServiceWorker } from './pwa'

initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker();
