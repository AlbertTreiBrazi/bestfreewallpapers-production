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
export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (context === undefined) {
    // Fallback for components not wrapped in provider - create simple state
    const [isOpen, setIsOpen] = useState(false)
    
    const onOpenAuthModal = useCallback(() => {
      setIsOpen(true)
    }, [])

    const onCloseAuthModal = useCallback(() => {
      setIsOpen(false)
    }, [])

    return { isOpen, onOpenAuthModal, onCloseAuthModal }
  }
  return context
}

// Export the AuthModal for backwards compatibility
export { AuthModal }
