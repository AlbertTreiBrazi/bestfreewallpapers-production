import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Wait for DOM to be ready before initializing
const initializeApp = () => {
  // Initialize only essential features
  if (typeof window !== 'undefined') {
    // Prevent ethereum property redefinition errors
    if (typeof (window as any).ethereum === 'undefined') {
      // Only set ethereum if it's not already defined (prevents MetaMask conflicts)
      Object.defineProperty(window, 'ethereum', {
        get: () => undefined,
        configurable: true
      });
    }
  }

  // Ensure root element exists before rendering
  const rootElement = document.getElementById('root')
  if (rootElement) {
    createRoot(rootElement).render(<App />)
  } else {
    console.error('[App] Root element not found')
  }
}

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp)
} else {
  // DOM is already loaded
  initializeApp()
}
