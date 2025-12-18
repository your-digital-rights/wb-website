import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'it', 'pl'],

  // Used when no locale matches
  defaultLocale: 'en',

  // automatically detect and redirect users based on their browser's Accept-Language header or system language
  localeDetection: true,

  // Use "as-needed" strategy: en at /, it at /it
  localePrefix: 'as-needed'
});
