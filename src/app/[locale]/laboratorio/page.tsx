import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ThemeProvider } from '@/components/theme-provider'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'laboratorio' })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://whiteboar.it'
  const canonicalUrl = locale === 'en' ? `${baseUrl}/laboratorio` : `${baseUrl}/${locale}/laboratorio`

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: {
      canonical: locale === 'en' ? '/laboratorio' : `/${locale}/laboratorio`,
      languages: {
        'en': '/laboratorio',
        'it': '/it/laboratorio',
      },
    },
  }
}

export default async function WorkshopPage({
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
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="w-full max-w-2xl">
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSdTfL7Uake8xN4GBgISdPV1j1uB1q_NDAxw8L_ZQzADhE_92g/viewform?embedded=true"
              width="100%"
              height="1026"
              frameBorder="0"
              marginHeight={0}
              marginWidth={0}
              className="mx-auto"
              title="Workshop Registration Form"
            >
              Loading…
            </iframe>
          </div>
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  )
}
