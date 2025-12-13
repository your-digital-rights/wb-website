/**
 * European Languages Data
 * Feature: 001-two-new-steps
 *
 * List of European languages with >1 million speakers available as add-ons.
 * English and Italian are excluded as they are included in the base package.
 *
 * Total: 27 languages available as add-ons (price fetched from Stripe API)
 */

export interface EuropeanLanguage {
  code: string; // ISO 639-1 code (e.g., 'fr', 'de')
  nameEn: string; // English name (e.g., 'French')
  nameIt: string; // Italian name (e.g., 'Francese')
  speakers: number; // Number of speakers in millions
}

export const EUROPEAN_LANGUAGES: EuropeanLanguage[] = [
  // Western Europe (5 languages)
  { code: 'nl', nameEn: 'Dutch', nameIt: 'Olandese', speakers: 24 },
  { code: 'fr', nameEn: 'French', nameIt: 'Francese', speakers: 80 },
  { code: 'de', nameEn: 'German', nameIt: 'Tedesco', speakers: 95 },
  { code: 'pt', nameEn: 'Portuguese', nameIt: 'Portoghese', speakers: 10 },
  { code: 'es', nameEn: 'Spanish', nameIt: 'Spagnolo', speakers: 47 },

  // Northern Europe (4 languages)
  { code: 'da', nameEn: 'Danish', nameIt: 'Danese', speakers: 6 },
  { code: 'fi', nameEn: 'Finnish', nameIt: 'Finlandese', speakers: 5.5 },
  { code: 'no', nameEn: 'Norwegian', nameIt: 'Norvegese', speakers: 5.5 },
  { code: 'sv', nameEn: 'Swedish', nameIt: 'Svedese', speakers: 13 },

  // Eastern Europe (7 languages)
  { code: 'bg', nameEn: 'Bulgarian', nameIt: 'Bulgaro', speakers: 8 },
  { code: 'cs', nameEn: 'Czech', nameIt: 'Ceco', speakers: 13 },
  { code: 'hu', nameEn: 'Hungarian', nameIt: 'Ungherese', speakers: 13 },
  { code: 'pl', nameEn: 'Polish', nameIt: 'Polacco', speakers: 40 },
  { code: 'ro', nameEn: 'Romanian', nameIt: 'Rumeno', speakers: 24 },
  { code: 'sk', nameEn: 'Slovak', nameIt: 'Slovacco', speakers: 5.4 },
  { code: 'uk', nameEn: 'Ukrainian', nameIt: 'Ucraino', speakers: 33 },

  // Southern Europe (7 languages)
  { code: 'sq', nameEn: 'Albanian', nameIt: 'Albanese', speakers: 6 },
  { code: 'bs', nameEn: 'Bosnian', nameIt: 'Bosniaco', speakers: 2.5 },
  { code: 'hr', nameEn: 'Croatian', nameIt: 'Croato', speakers: 5.6 },
  { code: 'el', nameEn: 'Greek', nameIt: 'Greco', speakers: 13 },
  { code: 'sr', nameEn: 'Serbian', nameIt: 'Serbo', speakers: 9 },
  { code: 'sl', nameEn: 'Slovenian', nameIt: 'Sloveno', speakers: 2.5 },
  { code: 'tr', nameEn: 'Turkish', nameIt: 'Turco', speakers: 88 },

  // Regional (4 languages)
  { code: 'ca', nameEn: 'Catalan', nameIt: 'Catalano', speakers: 9 },
  { code: 'lv', nameEn: 'Latvian', nameIt: 'Lettone', speakers: 1.75 },
  { code: 'lt', nameEn: 'Lithuanian', nameIt: 'Lituano', speakers: 3.2 },
];

/**
 * Get language name by locale
 * @param code ISO 639-1 language code
 * @param locale User's selected locale ('en' or 'it')
 * @returns Localized language name
 */
export function getLanguageName(code: string, locale: 'en' | 'it'): string {
  const language = EUROPEAN_LANGUAGES.find(lang => lang.code === code);
  if (!language) return code;
  return locale === 'it' ? language.nameIt : language.nameEn;
}

/**
 * Validate language code exists in available languages
 * @param code ISO 639-1 language code
 * @returns True if language is available
 */
export function isValidLanguageCode(code: string): boolean {
  return EUROPEAN_LANGUAGES.some(lang => lang.code === code);
}