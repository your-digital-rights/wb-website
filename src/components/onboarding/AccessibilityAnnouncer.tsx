'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react'

interface AnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  announceStepChange: (stepNumber: number, stepTitle: string, totalSteps?: number) => void
  announceError: (error: string) => void
  announceSuccess: (message: string) => void
  announceProgress: (current: number, total: number) => void
}

const AnnouncerContext = createContext<AnnouncerContextType | null>(null)

export function useAnnouncer() {
  const context = useContext(AnnouncerContext)
  if (!context) {
    throw new Error('useAnnouncer must be used within an AccessibilityAnnouncerProvider')
  }
  return context
}

interface AccessibilityAnnouncerProviderProps {
  children: ReactNode
}

export function AccessibilityAnnouncerProvider({ children }: AccessibilityAnnouncerProviderProps) {
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')

  // Use refs to track timeouts for cleanup
  const politeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const assertiveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clear messages after a delay to allow re-announcement of same message
  const clearPoliteMessage = useCallback(() => {
    if (politeTimeoutRef.current) {
      clearTimeout(politeTimeoutRef.current)
    }
    politeTimeoutRef.current = setTimeout(() => {
      setPoliteMessage('')
    }, 1000)
  }, [])

  const clearAssertiveMessage = useCallback(() => {
    if (assertiveTimeoutRef.current) {
      clearTimeout(assertiveTimeoutRef.current)
    }
    assertiveTimeoutRef.current = setTimeout(() => {
      setAssertiveMessage('')
    }, 1000)
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (politeTimeoutRef.current) clearTimeout(politeTimeoutRef.current)
      if (assertiveTimeoutRef.current) clearTimeout(assertiveTimeoutRef.current)
    }
  }, [])

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage(message)
      clearAssertiveMessage()
    } else {
      setPoliteMessage(message)
      clearPoliteMessage()
    }
  }, [clearPoliteMessage, clearAssertiveMessage])

  const announceStepChange = useCallback((stepNumber: number, stepTitle: string, totalSteps: number = 14) => {
    // Announce step change with assertive priority for immediate attention
    announce(`Step ${stepNumber} of ${totalSteps}: ${stepTitle}`, 'assertive')
  }, [announce])

  const announceError = useCallback((error: string) => {
    // Errors should be announced assertively
    announce(`Error: ${error}`, 'assertive')
  }, [announce])

  const announceSuccess = useCallback((message: string) => {
    announce(`Success: ${message}`, 'polite')
  }, [announce])

  const announceProgress = useCallback((current: number, total: number) => {
    const percentage = Math.round((current / total) * 100)
    announce(`Progress: ${percentage}% complete, step ${current} of ${total}`, 'polite')
  }, [announce])

  const value: AnnouncerContextType = {
    announce,
    announceStepChange,
    announceError,
    announceSuccess,
    announceProgress
  }

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      {/*
        ARIA Live Regions for Screen Reader Announcements
        - Uses sr-only class to hide visually but keep accessible
        - Two separate regions for polite and assertive messages
        - atomic ensures the entire content is announced
      */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  )
}

/**
 * Standalone announcer component for use outside provider
 * Useful for simple one-off announcements
 */
export function LiveRegion({
  message,
  priority = 'polite',
  clearAfter = 1000
}: {
  message: string
  priority?: 'polite' | 'assertive'
  clearAfter?: number
}) {
  const [currentMessage, setCurrentMessage] = useState(message)

  useEffect(() => {
    setCurrentMessage(message)
    if (clearAfter > 0 && message) {
      const timeout = setTimeout(() => setCurrentMessage(''), clearAfter)
      return () => clearTimeout(timeout)
    }
  }, [message, clearAfter])

  if (priority === 'assertive') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {currentMessage}
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  )
}
