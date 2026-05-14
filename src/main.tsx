import { createRoot, hydrateRoot } from 'react-dom/client'
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
    // CLS FIX: hydrateRoot este OBLIGATORIU.
    // "/" merge MEREU prin api/seo.ts (vezi vercel.json) care pre-randeaza
    // tab placeholder + hero in #root. hydrateRoot reconciliaza fara sa
    // stearga DOM-ul → fara shift. createRoot ar sterge pre-render-ul
    // si ar re-randa de la zero → CLS 0.331.
    if (rootElement.innerHTML.trim().length > 0) {
      hydrateRoot(rootElement, <App />, {
        onRecoverableError: () => {}
      })
    } else {
      createRoot(rootElement).render(<App />)
    }
  } else {
    console.error('[App] Root element not found')
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp)
} else {
  initializeApp()
}
