'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mail, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ArrowRight
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface EmailVerificationProps {
  email: string
  onVerificationComplete: (code: string) => void
  onResendCode: () => Promise<void>
  onBack?: () => void
  isVerifying?: boolean
  error?: string
  className?: string
}

export function EmailVerification({
  email,
  onVerificationComplete,
  onResendCode,
  onBack,
  isVerifying = false,
  error,
  className
}: EmailVerificationProps) {
  const t = useTranslations('onboarding.emailVerification')
  const { toast } = useToast()
  
  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [localError, setLocalError] = useState('')
  
  // Refs for OTP inputs
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // Timer for resend cooldown
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [resendCooldown])

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  // Handle OTP input change
  const handleOtpChange = (index: number, rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '')
    const newOtp = [...otp]

    // Allow the user to clear the current input
    if (!digitsOnly) {
      if (rawValue === '') {
        newOtp[index] = ''
        setOtp(newOtp)
        setLocalError('')
      }
      return
    }

    let lastFilledIndex = index - 1

    for (let i = 0; i < digitsOnly.length && index + i < 6; i++) {
      newOtp[index + i] = digitsOnly[i]
      lastFilledIndex = index + i
    }

    setOtp(newOtp)
    setLocalError('')

    const nextIndex = lastFilledIndex + 1
    if (nextIndex < 6) {
      inputRefs.current[nextIndex]?.focus()
    }
    
    // Auto-submit when complete
    if (newOtp.every(digit => digit) && !isVerifying) {
      const code = newOtp.join('')
      onVerificationComplete(code)
    }
  }

  // Handle backspace/delete
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // If current input is empty, move to previous and clear it
        const newOtp = [...otp]
        newOtp[index - 1] = ''
        setOtp(newOtp)
        inputRefs.current[index - 1]?.focus()
      } else if (otp[index]) {
        // Clear current input
        const newOtp = [...otp]
        newOtp[index] = ''
        setOtp(newOtp)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6)
    
    if (pastedData.length > 0) {
      const newOtp = [...otp]
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedData[i] || ''
      }
      setOtp(newOtp)
      
      // Focus appropriate input
      const lastFilledIndex = Math.min(pastedData.length - 1, 5)
      inputRefs.current[lastFilledIndex]?.focus()
      
      // Auto-submit if complete
      if (pastedData.length === 6 && !isVerifying) {
        onVerificationComplete(pastedData)
      }
    }
  }

  // Handle resend
  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return
    
    setIsResending(true)
    setLocalError('')
    
    try {
      await onResendCode()
      setResendCooldown(60) // 60 second cooldown
      toast({
        description: t('codeSent')
      })
    } catch (error) {
      setLocalError(t('resendError'))
    } finally {
      setIsResending(false)
    }
  }

  // Manual verification
  const handleManualVerify = () => {
    const code = otp.join('')
    if (code.length === 6) {
      onVerificationComplete(code)
    }
  }

  // Clear all inputs
  const handleClear = () => {
    setOtp(['', '', '', '', '', ''])
    setLocalError('')
    inputRefs.current[0]?.focus()
  }

  const isComplete = otp.every(digit => digit)
  const displayError = error || localError
  const canResend = resendCooldown === 0 && !isResending

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-accent/10 rounded-full flex items-center justify-center">
          <Mail className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground">
          {t.rich('description', {
            email: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            emailValue: email
          })}
        </p>
      </div>

      {/* OTP Input */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-center block">
          {t('enterCode')}
        </Label>
        
        <div className="flex justify-center gap-2">
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => { inputRefs.current[index] = el }}
              type="text"
              inputMode="numeric"
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              className={cn(
                "w-12 h-12 text-center text-lg font-semibold",
                "transition-all duration-200",
                displayError && "border-destructive focus-visible:ring-destructive",
                isComplete && !displayError && "border-green-500 focus-visible:ring-green-500"
              )}
              aria-label={t('digitLabel', { position: index + 1 })}
              disabled={isVerifying}
            />
          ))}
        </div>

        {/* Status Messages */}
        <AnimatePresence mode="wait">
          {displayError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-2 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle className="w-4 h-4" />
              {displayError}
            </motion.div>
          )}

          {isVerifying && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-2 text-sm text-accent"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('verifying')}
            </motion.div>
          )}

          {isComplete && !isVerifying && !displayError && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-2 text-sm text-green-600"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t('codeComplete')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        {/* Manual Verify Button (shown only when complete and not auto-submitting) */}
        {isComplete && !isVerifying && displayError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center"
          >
            <Button
              onClick={handleManualVerify}
              disabled={isVerifying}
              className="gap-2"
            >
              {t('verify')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* Resend Code */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('didntReceive')}
          </p>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={!canResend}
            className="gap-2"
          >
            {isResending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('sending')}
              </>
            ) : resendCooldown > 0 ? (
              <>
                <Clock className="w-4 h-4" />
                {t('resendIn', { seconds: resendCooldown })}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                {t('resendCode')}
              </>
            )}
          </Button>
        </div>

        {/* Clear/Back Actions */}
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={isVerifying || otp.every(digit => !digit)}
          >
            {t('clear')}
          </Button>
          
          {onBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              disabled={isVerifying}
            >
              {t('changeEmail')}
            </Button>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>{t('checkSpam')}</p>
        <p>{t('pasteSupported')}</p>
      </div>
    </div>
  )
}
