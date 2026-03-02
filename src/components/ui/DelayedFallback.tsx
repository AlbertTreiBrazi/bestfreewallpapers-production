import React, { useEffect, useState } from 'react'

interface DelayedFallbackProps {
  fallback: React.ReactNode
  show?: boolean
  delayMs?: number
  resetKey?: string
  keepSpace?: boolean
  className?: string
}

export function DelayedFallback({
  fallback,
  show = true,
  delayMs = 200,
  resetKey,
  keepSpace = false,
  className = ''
}: DelayedFallbackProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!show) {
      setVisible(false)
      return
    }

    const timer = window.setTimeout(() => {
      setVisible(true)
    }, delayMs)

    return () => window.clearTimeout(timer)
  }, [show, delayMs, resetKey])

  if (!show) return null

  if (keepSpace) {
    return <div className={`${visible ? '' : 'invisible'} ${className}`}>{fallback}</div>
  }

  return visible ? <>{fallback}</> : null
}

export default DelayedFallback
