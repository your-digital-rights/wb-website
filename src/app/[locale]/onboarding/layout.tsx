import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ThemeProvider } from '@/components/theme-provider'
import { OnboardingHeader } from './components/OnboardingHeader'
import { GoogleMapsProvider } from '@/components/onboarding/GoogleMapsProvider'

interface OnboardingLayoutProps {
  children: React.ReactNode
  params: Promise<{
    locale: string
  }>
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'onboarding.meta' })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://whiteboar.it'
  const canonicalUrl = `${baseUrl}/${locale}/onboarding`
  const ogImage = `/images/og-image-${locale}.png`

  return {
    title: t('title'),
    description: t('description'),
    robots: {
      index: false, // Don't index onboarding pages
      follow: false
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: canonicalUrl,
      siteName: 'WhiteBoar',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: t('title'),
        },
      ],
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: [ogImage],
    }
  }
}

export default async function OnboardingLayout({
  children
}: OnboardingLayoutProps) {
  return (
    <ThemeProvider>
      <GoogleMapsProvider>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
          {/* Header */}
          <OnboardingHeader />

          {/* Main Content */}
          <main className="relative z-10">
            {children}
          </main>

          {/* Footer */}
          <OnboardingFooter />
        </div>
      </GoogleMapsProvider>
    </ThemeProvider>
  )
}


// Onboarding Footer Component
function OnboardingFooter() {
  return (
    <footer className="border-t bg-background/50 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>© 2025 WhiteBoar</span>
          </div>

          <div className="flex items-center gap-2">
            <span>Secure & SSL Protected</span>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          </div>
        </div>
      </div>
    </footer>
  )
}