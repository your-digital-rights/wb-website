import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { ThemeProvider } from '@/components/theme-provider'

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacy.meta' })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://whiteboar.it'
  const canonicalUrl = locale === 'en' ? `${baseUrl}/privacy` : `${baseUrl}/${locale}/privacy`
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
      canonical: locale === 'en' ? '/privacy' : `/${locale}/privacy`,
      languages: {
        'en': '/privacy',
        'it': '/it/privacy',
      },
    },
  }
}

export default async function PrivacyPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'privacy' })

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col">
        <Navigation />

        <main className="flex-1">
          <div className="container mx-auto px-4 py-16 max-w-4xl">
            <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
            <p className="text-muted-foreground mb-12">{t('lastUpdated')}</p>

            <div className="space-y-8">
              {/* 1. Introduction */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.introduction.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed">
                  {t('sections.introduction.content')}
                </p>
              </section>

              {/* 2. Data Controller */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.controller.title')}
                </h2>
                <div className="text-foreground/90 leading-relaxed space-y-1">
                  <p>{t('sections.controller.name')}</p>
                  <p>{t('sections.controller.registration')}</p>
                  <p>{t('sections.controller.address')}</p>
                  <p>{t('sections.controller.email')}</p>
                </div>
              </section>

              {/* 3. Data Collection */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.dataCollection.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  {t('sections.dataCollection.intro')}
                </p>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-medium mb-2">
                      {t('sections.dataCollection.personal.title')}
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li className="text-foreground/90">{t('sections.dataCollection.personal.items.contact')}</li>
                      <li className="text-foreground/90">{t('sections.dataCollection.personal.items.business')}</li>
                      <li className="text-foreground/90">{t('sections.dataCollection.personal.items.payment')}</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-medium mb-2">
                      {t('sections.dataCollection.business.title')}
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li className="text-foreground/90">{t('sections.dataCollection.business.items.description')}</li>
                      <li className="text-foreground/90">{t('sections.dataCollection.business.items.assets')}</li>
                      <li className="text-foreground/90">{t('sections.dataCollection.business.items.preferences')}</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-medium mb-2">
                      {t('sections.dataCollection.technical.title')}
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li className="text-foreground/90">{t('sections.dataCollection.technical.items.analytics')}</li>
                      <li className="text-foreground/90">{t('sections.dataCollection.technical.items.logs')}</li>
                      <li className="text-foreground/90">{t('sections.dataCollection.technical.items.performance')}</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 4. Data Use */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.dataUse.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  {t('sections.dataUse.intro')}
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="text-foreground/90">{t('sections.dataUse.items.service')}</li>
                  <li className="text-foreground/90">{t('sections.dataUse.items.branding')}</li>
                  <li className="text-foreground/90">{t('sections.dataUse.items.hosting')}</li>
                  <li className="text-foreground/90">{t('sections.dataUse.items.communication')}</li>
                  <li className="text-foreground/90">{t('sections.dataUse.items.improvement')}</li>
                  <li className="text-foreground/90">{t('sections.dataUse.items.legal')}</li>
                  <li className="text-foreground/90">{t('sections.dataUse.items.analytics')}</li>
                </ul>
              </section>

              {/* 5. Legal Basis */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.legalBasis.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  {t('sections.legalBasis.intro')}
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="text-foreground/90">{t('sections.legalBasis.items.contract')}</li>
                  <li className="text-foreground/90">{t('sections.legalBasis.items.consent')}</li>
                  <li className="text-foreground/90">{t('sections.legalBasis.items.legitimate')}</li>
                  <li className="text-foreground/90">{t('sections.legalBasis.items.legal')}</li>
                </ul>
              </section>

              {/* 6. Data Sharing */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.dataSharing.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  {t('sections.dataSharing.intro')}
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="text-foreground/90">{t('sections.dataSharing.items.vercel')}</li>
                  <li className="text-foreground/90">{t('sections.dataSharing.items.supabase')}</li>
                  <li className="text-foreground/90">{t('sections.dataSharing.items.stripe')}</li>
                  <li className="text-foreground/90">{t('sections.dataSharing.items.analytics')}</li>
                  <li className="text-foreground/90">{t('sections.dataSharing.items.email')}</li>
                </ul>
                <p className="text-foreground/90 leading-relaxed mt-4">
                  {t('sections.dataSharing.location')}
                </p>
                <p className="text-foreground/90 leading-relaxed mt-2 font-medium">
                  {t('sections.dataSharing.noSale')}
                </p>
              </section>

              {/* 7. Data Retention */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.dataRetention.title')}
                </h2>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="text-foreground/90">{t('sections.dataRetention.active')}</li>
                  <li className="text-foreground/90">{t('sections.dataRetention.terminated')}</li>
                  <li className="text-foreground/90">{t('sections.dataRetention.legal')}</li>
                  <li className="text-foreground/90">{t('sections.dataRetention.backups')}</li>
                </ul>
              </section>

              {/* 8. Your Rights */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.yourRights.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  {t('sections.yourRights.intro')}
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="text-foreground/90">{t('sections.yourRights.items.access')}</li>
                  <li className="text-foreground/90">{t('sections.yourRights.items.rectification')}</li>
                  <li className="text-foreground/90">{t('sections.yourRights.items.erasure')}</li>
                  <li className="text-foreground/90">{t('sections.yourRights.items.restriction')}</li>
                  <li className="text-foreground/90">{t('sections.yourRights.items.portability')}</li>
                  <li className="text-foreground/90">{t('sections.yourRights.items.object')}</li>
                  <li className="text-foreground/90">{t('sections.yourRights.items.withdraw')}</li>
                </ul>
                <p className="text-foreground/90 leading-relaxed mt-4">
                  {t('sections.yourRights.exercise')}
                </p>
                <p className="text-foreground/90 leading-relaxed mt-2">
                  {t('sections.yourRights.complaint')}
                </p>
              </section>

              {/* 9. Cookies */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.cookies.title')}
                </h2>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="text-foreground/90">{t('sections.cookies.analytics')}</li>
                  <li className="text-foreground/90">{t('sections.cookies.essential')}</li>
                  <li className="text-foreground/90">{t('sections.cookies.noMarketing')}</li>
                  <li className="text-foreground/90">{t('sections.cookies.control')}</li>
                </ul>
              </section>

              {/* 10. Security */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.security.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  {t('sections.security.intro')}
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="text-foreground/90">{t('sections.security.items.encryption')}</li>
                  <li className="text-foreground/90">{t('sections.security.items.secure')}</li>
                  <li className="text-foreground/90">{t('sections.security.items.access')}</li>
                  <li className="text-foreground/90">{t('sections.security.items.monitoring')}</li>
                </ul>
                <p className="text-foreground/90 leading-relaxed mt-4">
                  {t('sections.security.breach')}
                </p>
              </section>

              {/* 11. Children */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.children.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed">
                  {t('sections.children.content')}
                </p>
              </section>

              {/* 12. Changes */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.changes.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed">
                  {t('sections.changes.content')}
                </p>
              </section>

              {/* 13. Contact */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.contact.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  {t('sections.contact.content')}
                </p>
                <div className="text-foreground/90 leading-relaxed space-y-1">
                  <p>{t('sections.contact.email')}</p>
                  <p>{t('sections.contact.address')}</p>
                </div>
              </section>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ThemeProvider>
  )
}
