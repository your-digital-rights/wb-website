'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { RotateCcw } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSelector } from '@/components/LanguageSelector'
import { WhiteBoarLogo } from '@/components/WhiteBoarLogo'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useOnboardingStore } from '@/stores/onboarding'
import { useToast } from '@/hooks/use-toast'

export function OnboardingHeader() {
  const t = useTranslations('onboarding.restart')
  const [showRestartDialog, setShowRestartDialog] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const { clearSession } = useOnboardingStore()
  const router = useRouter()
  const params = useParams<{ locale?: string }>()
  const locale = (params?.locale ?? 'en') as string
  const { toast } = useToast()

  const handleRestartClick = () => {
    setShowRestartDialog(true)
  }

  const handleRestartConfirm = async () => {
    setIsRestarting(true)

    try {
      // Clear the onboarding session state
      clearSession()

      // Navigate to onboarding welcome page with current locale
      router.push(`/${locale}/onboarding`)

      // Show success message
      toast({
        title: t('successTitle'),
        description: t('successDescription'),
      })
    } catch (error) {
      console.error('Failed to restart onboarding:', error)
      toast({
        title: t('errorTitle'),
        description: t('errorDescription'),
        variant: "destructive",
      })
    } finally {
      setIsRestarting(false)
      setShowRestartDialog(false)
    }
  }

  const handleRestartCancel = () => {
    setShowRestartDialog(false)
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/70 dark:bg-black/70 backdrop-blur-md border-b border-gray-200/20 dark:border-gray-800/20">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
                <WhiteBoarLogo
                  width={120}
                  height={40}
                  className="text-accent dark:text-accent"
                />
              </Link>
            </div>

            {/* Controls: Restart, Language, Theme */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestartClick}
                disabled={isRestarting}
                data-testid="restart-onboarding"
                className="text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-accent"
                aria-label={t('button')}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('button')}</span>
              </Button>
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Restart Confirmation Dialog */}
      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRestartCancel}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestartConfirm}
              disabled={isRestarting}
              data-testid="confirm-restart"
            >
              {isRestarting ? t('confirming') : t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
