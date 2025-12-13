import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ThemeProvider } from '@/components/theme-provider'
import { Navigation } from '@/components/Navigation'
import { CustomSoftwareHero } from '@/components/CustomSoftwareHero'
import { CustomSoftwareForm } from '@/components/CustomSoftwareForm'
import { PortfolioCarousel } from '@/components/PortfolioCarousel'
import { Footer } from '@/components/Footer'

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'customSoftware.meta' })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://whiteboar.it'
  const canonicalUrl = `${baseUrl}/${locale}/custom-software`
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
      canonical: locale === 'en' ? '/en/custom-software' : `/${locale}/custom-software`,
      languages: {
        'en': '/en/custom-software',
        'it': '/it/custom-software',
      },
    },
  }
}

export default async function CustomSoftwarePage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1">
          <CustomSoftwareHero />

          <section className="py-16 bg-background">
            <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
              <CustomSoftwareForm />
            </div>
          </section>

          <PortfolioCarousel />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  )
}
