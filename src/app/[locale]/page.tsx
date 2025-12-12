import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ThemeProvider } from '@/components/theme-provider'
import { Navigation } from '@/components/Navigation'
import { Hero } from '@/components/Hero'
import { Steps } from '@/components/Steps'
import { PricingTable } from '@/components/PricingTable'
import { PortfolioCarousel } from '@/components/PortfolioCarousel'
import { Footer } from '@/components/Footer'

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://whiteboar.it'
  const canonicalUrl = locale === 'en' ? baseUrl : `${baseUrl}/${locale}`
  const ogImage = `/images/og-image-${locale}.png`

  return {
    title: t('title'),
    description: t('description'),
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
      alternateLocale: locale === 'en' ? 'it' : 'en',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: [ogImage],
    },
    alternates: {
      canonical: locale === 'en' ? '/' : `/${locale}`,
      languages: {
        'en': '/',
        'it': '/it',
      },
    },
  }
}


export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1">
          <Hero />
          <Steps />
          <PricingTable />
          <PortfolioCarousel />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  )
}