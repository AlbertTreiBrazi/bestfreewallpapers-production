import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { SEOHead } from '@/components/seo/SEOHead'
import toast from 'react-hot-toast'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { theme } = useTheme()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const redirectUrl = sessionStorage.getItem('auth_redirect_url') || '/'

        // Check for error parameters first
        const error = searchParams.get('error')
        const error_description = searchParams.get('error_description')
        if (error) {
          setStatus('error')
          setMessage(error_description || 'Authentication failed')
          toast.error(error_description || 'Authentication failed')
          sessionStorage.removeItem('auth_redirect_url')
          setTimeout(() => navigate('/'), 3000)
          return
        }

        // Let Supabase handle the session automatically from URL
        // This works for both hash fragments (#access_token) and PKCE (code=)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (session && session.user) {
          setStatus('success')
          setMessage('Authentication successful! Redirecting...')
          toast.success('Successfully signed in!')
          sessionStorage.removeItem('auth_redirect_url')
          setTimeout(() => navigate(redirectUrl, { replace: true }), 1500)
          return
        }

        // Try PKCE code exchange if no session yet
        const code = searchParams.get('code')
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          )
          if (exchangeError || !data.user) {
            setStatus('error')
            setMessage('Failed to complete authentication')
            toast.error('Authentication failed')
            sessionStorage.removeItem('auth_redirect_url')
            setTimeout(() => navigate('/'), 3000)
            return
          }
          setStatus('success')
          setMessage('Authentication successful! Redirecting...')
          toast.success('Successfully signed in!')
          sessionStorage.removeItem('auth_redirect_url')
          setTimeout(() => navigate(redirectUrl, { replace: true }), 1500)
          return
        }

        // No session and no code - but check one more time after short delay
        // (hash fragment processing can be slightly delayed)
        setTimeout(async () => {
          const { data: { session: delayedSession } } = await supabase.auth.getSession()
          if (delayedSession?.user) {
            setStatus('success')
            setMessage('Authentication successful! Redirecting...')
            toast.success('Successfully signed in!')
            sessionStorage.removeItem('auth_redirect_url')
            navigate(redirectUrl, { replace: true })
          } else {
            setStatus('error')
            setMessage('Authentication could not be completed')
            toast.error('Authentication failed')
            sessionStorage.removeItem('auth_redirect_url')
            setTimeout(() => navigate('/'), 3000)
          }
        }, 1000)

      } catch (error: any) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred')
        toast.error('Authentication failed')
        sessionStorage.removeItem('auth_redirect_url')
        setTimeout(() => navigate('/'), 3000)
      }
    }

    handleAuthCallback()
  }, [searchParams, navigate])

  const seoConfig = {
    title: 'Authenticating - Best Free Wallpapers',
    description: 'Processing your authentication request for Best Free Wallpapers.',
    keywords: ['authentication', 'best free wallpapers']
  }

  return (
    <div className={`min-h-screen ${
      theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'
    } transition-colors duration-200 flex items-center justify-center p-4`}>
      <SEOHead config={seoConfig} />
      
      <div className={`max-w-md w-full ${
        theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'
      } border rounded-lg shadow-lg p-8 text-center transition-colors duration-200`}>
        {status === 'loading' && (
          <div>
            <Loader2 className={`w-16 h-16 mx-auto mb-4 animate-spin ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`} />
            <h2 className={`text-xl font-semibold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Processing authentication...
            </h2>
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
              Please wait while we verify your request.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className={`text-xl font-semibold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Success!
            </h2>
            <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              {message}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className={`text-xl font-semibold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Authentication Failed
            </h2>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              {message}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-gradient-to-r from-gray-600 to-blue-600 text-white py-2 px-4 rounded-lg hover:from-gray-700 hover:to-blue-700 transition-colors duration-200"
              >
                Return to Home
              </button>
              <button
                onClick={() => navigate('/auth')}
                className={`w-full py-2 px-4 rounded-lg border transition-colors duration-200 ${
                  theme === 'dark'
                    ? 'border-dark-border text-gray-300 hover:bg-dark-tertiary'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthCallbackPage
