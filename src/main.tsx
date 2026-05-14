import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Wait for DOM to be ready before initializing
const initializeApp = () => {
  if (typeof window !== 'undefined') {
    // Prevent ethereum property redefinition errors
    if (typeof (window as any).ethereum === 'undefined') {
      Object.defineProperty(window, 'ethereum', {
        get: () => undefined,
        configurable: true
      });
    }
  }

  const rootElement = document.getElementById('root')
  if (rootElement) {
    // CLS FIX: folosim INTOTDEAUNA createRoot (nu hydrateRoot).
    // hydrateRoot provoca double-render cand pre-render-ul din seo.ts
    // nu era disponibil (cache miss Cloudflare) → CLS 0.221.
    // Pre-render-ul din seo.ts ramane pentru SEO/boti, React rendereaza normal.
    createRoot(rootElement).render(<App />)
  } else {
    console.error('[App] Root element not found')
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp)
} else {
  initializeApp()
}
