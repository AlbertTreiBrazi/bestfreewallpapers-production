import { useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { AuthModal } from '@/components/auth/AuthModal'

// Context for auth modal state
interface AuthModalContextType {
  isOpen: boolean
  onOpenAuthModal: () => void
  onCloseAuthModal: () => void
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined)

// Provider component for auth modal context
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const onOpenAuthModal = useCallback(() => {
    setIsOpen(true)
  }, [])

  const onCloseAuthModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <AuthModalContext.Provider value={{ isOpen, onOpenAuthModal, onCloseAuthModal }}>
      {children}
      <AuthModal 
        isOpen={isOpen} 
        onClose={onCloseAuthModal} 
      />
    </AuthModalContext.Provider>
  )
}

// Hook for using auth modal
// IMPORTANT: This hook must be used inside an <AuthModalProvider> (which wraps the whole app in App.tsx).
// If used outside, it throws — this prevents conditional Hook calls (Rules of Hooks violation).
export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider')
  }
  return context
}

// Export the AuthModal for backwards compatibility
export { AuthModal }
