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
    // seo.ts NU mai pre-randeaza body-ul (doar meta tags in <head>).
    // #root vine gol → createRoot e corect. CLS-ul se rezolva prin
    // rezervare de spatiu in componentele React (Header, Banner, hero, tabs).
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
