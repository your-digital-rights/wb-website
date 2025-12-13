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
  const t = await getTranslations({ locale, namespace: 'terms.meta' })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://whiteboar.it'
  const canonicalUrl = locale === 'en' ? `${baseUrl}/terms` : `${baseUrl}/${locale}/terms`
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
      canonical: locale === 'en' ? '/terms' : `/${locale}/terms`,
      languages: {
        'en': '/terms',
        'it': '/it/terms',
      },
    },
  }
}

export default async function TermsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'terms' })

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col">
        <Navigation />

        <main className="flex-1">
          <div className="container mx-auto px-4 py-16 max-w-4xl">
            <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
            <p className="text-muted-foreground mb-12">{t('lastUpdated')}</p>

            <div className="space-y-8">
              {/* 1. Acceptance */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.acceptance.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed">
                  {t('sections.acceptance.content')}
                </p>
              </section>

              {/* 2. Service Provider */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.serviceProvider.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed">
                  {t('sections.serviceProvider.content')}
                </p>
              </section>

              {/* 3. Services */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.services.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  {t('sections.services.intro')}
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="text-foreground/90">{t('sections.services.items.branding')}</li>
                  <li className="text-foreground/90">{t('sections.services.items.design')}</li>
                  <li className="text-foreground/90">{t('sections.services.items.hosting')}</li>
                  <li className="text-foreground/90">{t('sections.services.items.seo')}</li>
                  <li className="text-foreground/90">{t('sections.services.items.multilingual')}</li>
                  <li className="text-foreground/90">{t('sections.services.items.support')}</li>
                </ul>
              </section>

              {/* 4. Subscription */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.subscription.title')}
                </h2>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="text-foreground/90">{t('sections.subscription.monthly')}</li>
                  <li className="text-foreground/90">{t('sections.subscription.commitment')}</li>
                  <li className="text-foreground/90">{t('sections.subscription.included')}</li>
                  <li className="text-foreground/90">{t('sections.subscription.overage')}</li>
                  <li className="text-foreground/90">{t('sections.subscription.addons')}</li>
                  <li className="text-foreground/90">{t('sections.subscription.renewal')}</li>
                  <li className="text-foreground/90">{t('sections.subscription.cancellation')}</li>
                </ul>
              </section>

              {/* 5. Money-Back Guarantee */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.guarantee.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed">
                  {t('sections.guarantee.content')}
                </p>
              </section>

              {/* 6. Domain Transfer */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.domain.title')}
                </h2>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="text-foreground/90">{t('sections.domain.ownership')}</li>
                  <li className="text-foreground/90">{t('sections.domain.registration')}</li>
                  <li className="text-foreground/90">{t('sections.domain.transfer')}</li>
                  <li className="text-foreground/90">{t('sections.domain.process')}</li>
                  <li className="text-foreground/90">{t('sections.domain.requirements')}</li>
                </ul>
              </section>

              {/* 7. Intellectual Property */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.intellectualProperty.title')}
                </h2>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="text-foreground/90">{t('sections.intellectualProperty.yourContent')}</li>
                  <li className="text-foreground/90">{t('sections.intellectualProperty.generatedContent')}</li>
                  <li className="text-foreground/90">{t('sections.intellectualProperty.platform')}</li>
                  <li className="text-foreground/90">{t('sections.intellectualProperty.license')}</li>
                </ul>
              </section>

              {/* 8. User Responsibilities */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.userResponsibilities.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  {t('sections.userResponsibilities.intro')}
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="text-foreground/90">{t('sections.userResponsibilities.items.accurate')}</li>
                  <li className="text-foreground/90">{t('sections.userResponsibilities.items.legal')}</li>
                  <li className="text-foreground/90">{t('sections.userResponsibilities.items.compliance')}</li>
                  <li className="text-foreground/90">{t('sections.userResponsibilities.items.prohibited')}</li>
                  <li className="text-foreground/90">{t('sections.userResponsibilities.items.security')}</li>
                </ul>
              </section>

              {/* 9. Service Level */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.serviceLevel.title')}
                </h2>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="text-foreground/90">{t('sections.serviceLevel.effort')}</li>
                  <li className="text-foreground/90">{t('sections.serviceLevel.uptime')}</li>
                  <li className="text-foreground/90">{t('sections.serviceLevel.maintenance')}</li>
                  <li className="text-foreground/90">{t('sections.serviceLevel.support')}</li>
                </ul>
              </section>

              {/* 10. Limitation of Liability */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.limitation.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed">
                  {t('sections.limitation.content')}
                </p>
              </section>

              {/* 11. Termination */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.termination.title')}
                </h2>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="text-foreground/90">{t('sections.termination.byUser')}</li>
                  <li className="text-foreground/90">{t('sections.termination.byUs')}</li>
                  <li className="text-foreground/90">{t('sections.termination.effect')}</li>
                  <li className="text-foreground/90">{t('sections.termination.data')}</li>
                </ul>
              </section>

              {/* 12. Modifications */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.modifications.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed">
                  {t('sections.modifications.content')}
                </p>
              </section>

              {/* 13. Governing Law */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.governingLaw.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed">
                  {t('sections.governingLaw.content')}
                </p>
              </section>

              {/* 14. Contact */}
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  {t('sections.contact.title')}
                </h2>
                <p className="text-foreground/90 leading-relaxed">
                  {t('sections.contact.content')}
                </p>
              </section>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ThemeProvider>
  )
}
