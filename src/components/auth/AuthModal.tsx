import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Eye, EyeOff, User, Mail, Lock, CheckCircle, XCircle, ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GoogleIcon } from '@/components/icons/GoogleIcon'
import { FacebookIcon } from '@/components/icons/FacebookIcon'
import { FEATURE_FLAGS, isFeatureEnabled } from '@/config/features'
import monitoringService from '@/services/monitoringService'
import toast from 'react-hot-toast'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'register'
}

interface TurnstileResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

type EmailAuthMode = 'password' | 'magic-link' | null

interface PasswordValidation {
  length: boolean
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  special: boolean
  validClasses: number
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState<'google' | 'facebook' | 'email' | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailExpanded, setEmailExpanded] = useState(false)
  const [emailAuthMode, setEmailAuthMode] = useState<EmailAuthMode>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileLoaded, setTurnstileLoaded] = useState(false)
  const [turnstileFailed, setTurnstileFailed] = useState(false)
  const { signIn, signUp, resetPassword, user } = useAuth()
  const { theme } = useTheme() // Add theme context

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: ''
  })

  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    length: false,
    uppercase: false,
    lowercase: false,
    numbers: false,
    special: false,
    validClasses: 0
  })

  // Password validation function
  const validatePassword = (pwd: string): PasswordValidation => {
    const length = pwd.length >= 10
    const uppercase = /[A-Z]/.test(pwd)
    const lowercase = /[a-z]/.test(pwd)
    const numbers = /[0-9]/.test(pwd)
    const special = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd)
    
    const validClasses = [uppercase, lowercase, numbers, special].filter(Boolean).length
    
    return {
      length,
      uppercase,
      lowercase,
      numbers,
      special,
      validClasses
    }
  }

  // Check if password meets all requirements
  const isPasswordValid = (): boolean => {
    return passwordValidation.length && passwordValidation.validClasses >= 3
  }

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Handle OAuth sign in
  const handleOAuthSignIn = async (oauthProvider: 'google' | 'facebook') => {
    if (!isFeatureEnabled(`AUTH_OAUTH_${oauthProvider.toUpperCase()}` as any)) {
      toast.error(`${oauthProvider} authentication is currently disabled`)
      return
    }

    setLoading(true)
    setProvider(oauthProvider)

    try {
      const redirectUrl = window.location.pathname + window.location.search || '/'
      sessionStorage.setItem('auth_redirect_url', redirectUrl)
      
      const redirectTo = `${window.location.protocol}//${window.location.host}/auth/callback`
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: oauthProvider,
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false
        }
      })

      if (error) throw error
    } catch (error: any) {
      console.error('OAuth error:', error)
      toast.error(error.message || 'Failed to sign in. Please try again.')
      setLoading(false)
      setProvider(null)
    }
  }

  // Load Cloudflare Turnstile (only for Magic Link mode)
  useEffect(() => {
    if (!isFeatureEnabled('AUTH_EMAIL_OTP_ENHANCED') || emailAuthMode !== 'magic-link') {
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    
    const timeout = setTimeout(() => {
      if (!turnstileLoaded) {
        console.warn('Turnstile failed to load - allowing auth without CAPTCHA')
        setTurnstileFailed(true)
      }
    }, 5000)
    
    script.onload = () => {
      clearTimeout(timeout)
      setTurnstileLoaded(true)
      renderTurnstile()
    }
    
    script.onerror = () => {
      clearTimeout(timeout)
      console.error('Turnstile script failed to load')
      setTurnstileFailed(true)
    }
    
    document.body.appendChild(script)
    
    return () => {
      clearTimeout(timeout)
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [emailAuthMode])

  // Render Turnstile widget
  const renderTurnstile = () => {
    if (typeof window !== 'undefined' && (window as any).turnstile) {
      const container = document.getElementById('modal-turnstile-container')
      if (container && container.children.length === 0) {
        try {
          (window as any).turnstile.render('#modal-turnstile-container', {
            sitekey: '0x4AAAAAAAgQvBhEOvUl_pVP',
            callback: (token: string) => {
              setTurnstileToken(token)
              setTurnstileFailed(false)
            },
            'error-callback': () => {
              console.error('Turnstile verification failed')
              setTurnstileToken(null)
              setTurnstileFailed(true)
            },
            'expired-callback': () => {
              setTurnstileToken(null)
            },
            theme: 'light',
            size: 'normal'
          })
        } catch (error) {
          console.error('Turnstile render error:', error)
          setTurnstileFailed(true)
        }
      }
    }
  }

  // Enhanced Body Scroll Lock Effect
  useEffect(() => {
    if (isOpen) {
      // Dispatch custom event to close all dropdowns when modal opens
      window.dispatchEvent(new CustomEvent('modal:open'))

      // Store current scroll position
      const scrollY = window.scrollY

      // Apply scroll lock
      if (document.body) {
        document.body.classList.add('modal-open')
        document.body.style.top = `-${scrollY}px`
        document.body.style.width = '100%'
      }

      // Prevent overscroll on mobile
      if (document.documentElement) {
        document.documentElement.style.overflow = 'hidden'
      }
    } else {
      // Restore body scroll
      if (document.body) {
        document.body.classList.remove('modal-open')
        const scrollY = document.body.style.top

        // Clean up styles
        document.body.style.top = ''
        document.body.style.width = ''

        // Restore scroll position
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || '0') * -1)
        }
      }

      if (document.documentElement) {
        document.documentElement.style.overflow = ''
      }
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open')
      document.body.style.top = ''
      document.body.style.width = ''
      document.documentElement.style.overflow = ''
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const startTime = Date.now()
    
    try {
      if (mode === 'login') {
        await signIn(formData.email, formData.password)
        
        // Track successful login
        monitoringService.trackBusinessEvent({
          event_type: 'user_login_success',
          url: window.location.href,
          metadata: {
            email: formData.email,
            duration_ms: Date.now() - startTime
          }
        })
        
        toast.success('Welcome back!')
        onClose() // Close modal after successful login
      } else if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match')
          
          // Track validation error
          monitoringService.trackBusinessEvent({
            event_type: 'signup_validation_error',
            url: window.location.href,
            metadata: {
              error_type: 'password_mismatch',
              duration_ms: Date.now() - startTime
            }
          })
          
          return
        }
        if (!isPasswordValid()) {
          toast.error('Password does not meet security requirements. Please check the criteria below.')
          
          // Track validation error
          monitoringService.trackBusinessEvent({
            event_type: 'signup_validation_error',
            url: window.location.href,
            metadata: {
              error_type: 'weak_password',
              password_score: passwordValidation.validClasses,
              duration_ms: Date.now() - startTime
            }
          })
          
          return
        }
        
        await signUp(formData.email, formData.password, formData.fullName)
        
        // Track successful signup
        monitoringService.trackUserSignup('pending') // User ID not available yet
        monitoringService.trackBusinessEvent({
          event_type: 'user_signup_completed',
          url: window.location.href,
          metadata: {
            email: formData.email,
            full_name: formData.fullName,
            password_strength: passwordValidation.validClasses,
            duration_ms: Date.now() - startTime
          }
        })
        
        toast.success('Account created! Please check your email to verify your account before signing in.')
        setMode('login') // Switch to login mode after successful signup
      } else if (mode === 'forgot') {
        await resetPassword(formData.email)
        
        // Track password reset request
        monitoringService.trackBusinessEvent({
          event_type: 'password_reset_requested',
          url: window.location.href,
          metadata: {
            email: formData.email,
            duration_ms: Date.now() - startTime
          }
        })
        
        toast.success('Password reset email sent!')
        setMode('login') // Switch back to login mode
      }
    } catch (error) {
      // Track authentication errors
      monitoringService.trackError({
        message: `Authentication error in ${mode} mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        metadata: {
          auth_mode: mode,
          email: formData.email,
          duration_ms: Date.now() - startTime
        }
      })
      
      monitoringService.trackBusinessEvent({
        event_type: `${mode}_error`,
        url: window.location.href,
        metadata: {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          email: formData.email,
          duration_ms: Date.now() - startTime
        }
      })
      
      // Error handling is done in the auth context
    } finally {
      setLoading(false)
    }
  }

  // Handle password sign in (for unified auth)
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isFeatureEnabled('AUTH_EMAIL_PASSWORD')) {
      toast.error('Email+password authentication is currently disabled')
      return
    }
    
    if (!email || !password) {
      toast.error('Please enter your email and password')
      return
    }

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)
    setProvider('email')

    try {
      const redirectUrl = window.location.pathname + window.location.search || '/'
      sessionStorage.setItem('auth_redirect_url', redirectUrl)
      
      await signIn(email, password)
      
      toast.success('Welcome back!')
      onClose() // Close modal after successful login
    } catch (error: any) {
      console.error('Password sign in error:', error)
      toast.error(error.message || 'Failed to sign in. Please try again.')
    } finally {
      setLoading(false)
      setProvider(null)
    }
  }

  // Handle magic link sign in (for unified auth)
  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isFeatureEnabled('AUTH_EMAIL_OTP_ENHANCED')) {
      toast.error('Magic link authentication is currently disabled')
      return
    }
    
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    // Check Turnstile only if it loaded successfully
    if (turnstileLoaded && !turnstileFailed && !turnstileToken) {
      toast.error('Please complete the security verification')
      return
    }

    setLoading(true)
    setProvider('email')

    try {
      const redirectUrl = window.location.pathname + window.location.search || '/'
      sessionStorage.setItem('auth_redirect_url', redirectUrl)
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.protocol}//${window.location.host}/auth/callback`
        }
      })

      if (error) throw error

      toast.success('Magic link sent! Check your email.')
      onClose()
    } catch (error: any) {
      console.error('Magic link error:', error)
      toast.error(error.message || 'Failed to send magic link. Please try again.')
    } finally {
      setLoading(false)
      setProvider(null)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Real-time password validation for register mode
    if (name === 'password' && mode === 'register') {
      const validation = validatePassword(value)
      setPasswordValidation(validation)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-backdrop bg-black bg-opacity-50">
      <div className={`modal-content bg-theme-modal border border-theme-light rounded-lg shadow-xl w-full max-w-[calc(100vw-1rem)] sm:max-w-sm md:max-w-md mx-auto my-auto relative ${theme} safe-area-inset`}>
        {/* Close button - Mobile Optimized */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-theme-tertiary hover:text-theme-secondary text-xl z-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-theme-secondary transition-colors touch-manipulation"
          aria-label="Close modal"
        >
          ×
        </button>

        <div className="p-4 sm:p-5 md:p-6">
          {/* Header */}
          <div className="text-center mb-5 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-theme-primary mb-2">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
            </h2>
            <p className="text-theme-secondary text-sm md:text-base">
              {mode === 'login' && 'Sign in to download wallpapers'}
              {mode === 'register' && 'Join to access premium wallpapers'}
              {mode === 'forgot' && 'Enter your email to reset password'}
            </p>
          </div>

          {/* Error Message - Removed searchParams dependency to fix Router context issue */}
          {/* Error handling is now done through toast notifications instead */}

          {/* OAuth Buttons - Only show when unified auth is enabled and not in forgot mode */}
          {isFeatureEnabled('AUTH_UNIFIED') && mode !== 'forgot' && (isFeatureEnabled('AUTH_OAUTH_GOOGLE') || isFeatureEnabled('AUTH_OAUTH_FACEBOOK')) && (
            <div className="space-y-3 mb-6">
              {isFeatureEnabled('AUTH_OAUTH_GOOGLE') && (
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={loading && provider === 'google'}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-white dark:bg-gray-800"
                >
                  {loading && provider === 'google' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-700 dark:text-gray-300" />
                  ) : (
                    <GoogleIcon className="w-5 h-5" />
                  )}
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    Continue with Google
                  </span>
                </button>
              )}

              {isFeatureEnabled('AUTH_OAUTH_FACEBOOK') && (
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('facebook')}
                  disabled={loading && provider === 'facebook'}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-white dark:bg-gray-800"
                >
                  {loading && provider === 'facebook' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-700 dark:text-gray-300" />
                  ) : (
                    <FacebookIcon className="w-5 h-5" />
                  )}
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    Continue with Facebook
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Divider - Only show when unified auth is enabled and OAuth is available */}
          {isFeatureEnabled('AUTH_UNIFIED') && mode !== 'forgot' && (isFeatureEnabled('AUTH_OAUTH_GOOGLE') || isFeatureEnabled('AUTH_OAUTH_FACEBOOK')) && (isFeatureEnabled('AUTH_EMAIL_PASSWORD') || isFeatureEnabled('AUTH_EMAIL_OTP_ENHANCED')) && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with email</span>
              </div>
            </div>
          )}

          {/* Email Section - Unified Auth */}
          {isFeatureEnabled('AUTH_UNIFIED') && mode !== 'forgot' && (isFeatureEnabled('AUTH_EMAIL_PASSWORD') || isFeatureEnabled('AUTH_EMAIL_OTP_ENHANCED')) && (
            <div className="space-y-4">
              {/* Email Expand Button */}
              <button
                type="button"
                onClick={() => setEmailExpanded(!emailExpanded)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all cursor-pointer"
              >
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-700 dark:text-blue-300">
                  Continue with Email
                </span>
                {emailExpanded ? (
                  <ChevronUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </button>

              {/* Expanded Email Options */}
              {emailExpanded && (
                <div className="space-y-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                  {/* Email Input (shared) */}
                  <div>
                    <label htmlFor="modal-email" className="block text-sm font-medium text-theme-secondary mb-2">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <input
                        id="modal-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        disabled={loading}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      />
                    </div>
                  </div>

                  {/* Auth Mode Selection */}
                  {!emailAuthMode && (
                    <div className="space-y-3">
                      {/* Password Option */}
                      {isFeatureEnabled('AUTH_EMAIL_PASSWORD') && (
                        <button
                          type="button"
                          onClick={() => setEmailAuthMode('password')}
                          className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all cursor-pointer"
                        >
                          <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <span className="font-medium text-gray-700 dark:text-gray-200">
                            Sign in with Password
                          </span>
                        </button>
                      )}

                      {/* Magic Link Option */}
                      {isFeatureEnabled('AUTH_EMAIL_OTP_ENHANCED') && (
                        <button
                          type="button"
                          onClick={() => setEmailAuthMode('magic-link')}
                          className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all cursor-pointer"
                        >
                          <Mail className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-700 dark:text-gray-200">
                            Get Magic Link
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Password Form */}
                  {emailAuthMode === 'password' && (
                    <form onSubmit={handlePasswordSignIn} className="space-y-4">
                      <div>
                        <label htmlFor="modal-password" className="block text-sm font-medium text-theme-secondary mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                          <input
                            id="modal-password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            disabled={loading}
                            className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setEmailAuthMode(null)}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                          ← Back
                        </button>
                        {isFeatureEnabled('AUTH_FORGOT_PASSWORD') && (
                          <button
                            type="button"
                            onClick={() => {
                              setMode('forgot')
                              setEmailExpanded(false)
                              setEmailAuthMode(null)
                            }}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !isValidEmail(email) || !password}
                        className="w-full bg-blue-600 dark:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading && provider === 'email' ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          'Sign in'
                        )}
                      </button>
                    </form>
                  )}

                  {/* Magic Link Form */}
                  {emailAuthMode === 'magic-link' && (
                    <form onSubmit={handleMagicLinkSignIn} className="space-y-4">
                      {/* Cloudflare Turnstile */}
                      <div className="w-full" style={{ display: 'block', visibility: 'visible' }}>
                        <div className="flex justify-center min-h-[65px] w-full" style={{ display: 'flex', visibility: 'visible' }}>
                          <div id="modal-turnstile-container" className="w-full flex justify-center" style={{ display: 'block', visibility: 'visible', minHeight: '65px' }}></div>
                        </div>
                        
                        {!turnstileLoaded && !turnstileFailed && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                            Loading security verification...
                          </div>
                        )}
                        
                        {turnstileFailed && (
                          <div className="text-sm text-gray-600 dark:text-gray-300 text-center mt-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-2">
                            Quick security check couldn't load. You can continue.
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setEmailAuthMode(null)}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                          ← Back
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || (!turnstileFailed && turnstileLoaded && !turnstileToken) || !isValidEmail(email)}
                        className="w-full bg-blue-600 dark:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading && provider === 'email' ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Sending magic link...
                          </>
                        ) : (
                          'Send magic link'
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Original Form - Legacy/Fallback when unified auth is disabled or for register/forgot modes */}
          {!isFeatureEnabled('AUTH_UNIFIED') || mode === 'register' || mode === 'forgot' ? (
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-theme-tertiary" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required={mode === 'register'}
                      className="form-input w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-base min-h-[44px] touch-manipulation"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-theme-tertiary" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="form-input w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-base min-h-[44px] touch-manipulation"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Password {mode === 'register' && '(Strong password required)'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-theme-tertiary" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="form-input w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-base min-h-[44px] touch-manipulation"
                    placeholder={mode === 'register' ? 'Enter a strong password (10+ chars)' : 'Enter your password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-theme-tertiary hover:text-theme-secondary min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Password Requirements for Register Mode */}
                {mode === 'register' && formData.password && (
                  <div className="mt-3 space-y-2">
                    <h4 className="text-sm font-medium text-theme-secondary">Password Requirements:</h4>
                    <div className="space-y-1">
                      <div className={`flex items-center space-x-2 text-sm ${
                        passwordValidation.length ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {passwordValidation.length ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        <span>At least 10 characters</span>
                      </div>
                      <div className={`flex items-center space-x-2 text-sm ${
                        passwordValidation.validClasses >= 3 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {passwordValidation.validClasses >= 3 ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        <span>At least 3 character types: uppercase, lowercase, numbers, special ({passwordValidation.validClasses}/3)</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div className={`flex items-center space-x-1 ${
                        passwordValidation.uppercase ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          passwordValidation.uppercase ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span>Uppercase (A-Z)</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${
                        passwordValidation.lowercase ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          passwordValidation.lowercase ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span>Lowercase (a-z)</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${
                        passwordValidation.numbers ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          passwordValidation.numbers ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span>Numbers (0-9)</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${
                        passwordValidation.special ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          passwordValidation.special ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span>Special (!@#$%...)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-theme-tertiary" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required={mode === 'register'}
                    className="form-input w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-base min-h-[44px] touch-manipulation"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            )}

              <button
                type="submit"
                disabled={loading || (mode === 'register' && !isPasswordValid())}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-200 text-base min-h-[44px] touch-manipulation ${
                  loading || (mode === 'register' && !isPasswordValid())
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-gray-600 to-blue-600 text-white hover:from-gray-700 hover:to-blue-700'
                }`}
              >
                {loading ? 'Loading...' : (
                  mode === 'login' ? 'Sign In' :
                  mode === 'register' ? 'Create Account' : 'Send Reset Email'
                )}
              </button>
            </form>
          ) : null}

          {/* Footer - Mobile Optimized */}
          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <div className="mt-5 md:mt-6 text-center">
              {!isFeatureEnabled('AUTH_UNIFIED') && mode === 'login' && (
                <>
                  <button
                    onClick={() => setMode('forgot')}
                    className="text-gray-600 hover:text-gray-700 text-sm mb-4 block min-h-[44px] w-full flex items-center justify-center touch-manipulation"
                  >
                    Forgot your password?
                  </button>
                  <p className="text-theme-secondary text-sm">
                    Don't have an account?{' '}
                    <button
                      onClick={() => setMode('register')}
                      className="text-gray-600 hover:text-gray-700 font-semibold underline touch-manipulation"
                    >
                      Sign up
                    </button>
                  </p>
                </>
              )}
              {!isFeatureEnabled('AUTH_UNIFIED') && mode === 'register' && (
                <p className="text-theme-secondary text-sm">
                  Already have an account?{' '}
                  <button
                    onClick={() => setMode('login')}
                    className="text-gray-600 hover:text-gray-700 font-semibold underline touch-manipulation"
                  >
                    Sign in
                  </button>
                </p>
              )}
              {!isFeatureEnabled('AUTH_UNIFIED') && mode === 'forgot' && (
                <p className="text-theme-secondary text-sm">
                  Remember your password?{' '}
                  <button
                    onClick={() => setMode('login')}
                    className="text-gray-600 hover:text-gray-700 font-semibold underline touch-manipulation"
                  >
                    Sign in
                  </button>
                </p>
              )}
              {isFeatureEnabled('AUTH_UNIFIED') && mode === 'register' && (
                <p className="text-theme-secondary text-sm">
                  Already have an account?{' '}
                  <button
                    onClick={() => setMode('login')}
                    className="text-gray-600 hover:text-gray-700 font-semibold underline touch-manipulation"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
