import '@/app/globals.css';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Metadata } from 'next';
import { CookieConsent } from '@/components/CookieConsent';
import { GoogleTagManager } from '@next/third-parties/google';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://whiteboar.it'),
  icons: {
    icon: '/images/favicon.ico',
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: LayoutProps<'/[locale]'>)  {
  // Ensure that the incoming `locale` is valid
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  const messages = await getMessages({ locale });

  return (
    <html lang={locale} className="scroll-smooth light">
      <head></head>
      <GoogleTagManager gtmId="GTM-K8XHX82G" />
      <body className="font-body antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
          <CookieConsent />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}