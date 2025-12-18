/**
 * European Languages Data
 * Feature: 001-two-new-steps
 *
 * List of European languages with >1 million speakers available as add-ons.
 * English and Italian are excluded as they are included in the base package.
 *
 * Total: 27 languages available as add-ons (price fetched from Stripe API)
 */

import { Locale } from '@/lib/i18n';

export interface EuropeanLanguage {
  code: string; // ISO 639-1 code (e.g., 'fr', 'de')
  nameEn: string; // English name (e.g., 'French')
  nameIt: string; // Italian name (e.g., 'Francese')
  namePl: string; // Polish name (e.g., 'Francuski')
  speakers: number; // Number of speakers in millions
}

export const EUROPEAN_LANGUAGES: EuropeanLanguage[] = [
  // Western Europe (5 languages)
  { code: 'nl', nameEn: 'Dutch', nameIt: 'Olandese', namePl: 'Holenderski', speakers: 24 },
  { code: 'fr', nameEn: 'French', nameIt: 'Francese', namePl: 'Francuski', speakers: 80 },
  { code: 'de', nameEn: 'German', nameIt: 'Tedesco', namePl: 'Niemiecki', speakers: 95 },
  { code: 'pt', nameEn: 'Portuguese', nameIt: 'Portoghese', namePl: 'Portugalski', speakers: 10 },
  { code: 'es', nameEn: 'Spanish', nameIt: 'Spagnolo', namePl: 'Hiszpanski', speakers: 47 },

  // Northern Europe (4 languages)
  { code: 'da', nameEn: 'Danish', nameIt: 'Danese', namePl: 'Dunski', speakers: 6 },
  { code: 'fi', nameEn: 'Finnish', nameIt: 'Finlandese', namePl: 'Finski', speakers: 5.5 },
  { code: 'no', nameEn: 'Norwegian', nameIt: 'Norvegese', namePl: 'Norweski', speakers: 5.5 },
  { code: 'sv', nameEn: 'Swedish', nameIt: 'Svedese', namePl: 'Szwedzki', speakers: 13 },

  // Eastern Europe (7 languages)
  { code: 'bg', nameEn: 'Bulgarian', nameIt: 'Bulgaro', namePl: 'Bulgarski', speakers: 8 },
  { code: 'cs', nameEn: 'Czech', nameIt: 'Ceco', namePl: 'Czeski', speakers: 13 },
  { code: 'hu', nameEn: 'Hungarian', nameIt: 'Ungherese', namePl: 'Wegierski', speakers: 13 },
  { code: 'pl', nameEn: 'Polish', nameIt: 'Polacco', namePl: 'Polski', speakers: 40 },
  { code: 'ro', nameEn: 'Romanian', nameIt: 'Rumeno', namePl: 'Rumunski', speakers: 24 },
  { code: 'sk', nameEn: 'Slovak', nameIt: 'Slovacco', namePl: 'Slowacki', speakers: 5.4 },
  { code: 'uk', nameEn: 'Ukrainian', nameIt: 'Ucraino', namePl: 'Ukrainski', speakers: 33 },

  // Southern Europe (7 languages)
  { code: 'sq', nameEn: 'Albanian', nameIt: 'Albanese', namePl: 'Albanski', speakers: 6 },
  { code: 'bs', nameEn: 'Bosnian', nameIt: 'Bosniaco', namePl: 'Bosniacki', speakers: 2.5 },
  { code: 'hr', nameEn: 'Croatian', nameIt: 'Croato', namePl: 'Chorwacki', speakers: 5.6 },
  { code: 'el', nameEn: 'Greek', nameIt: 'Greco', namePl: 'Grecki', speakers: 13 },
  { code: 'sr', nameEn: 'Serbian', nameIt: 'Serbo', namePl: 'Serbski', speakers: 9 },
  { code: 'sl', nameEn: 'Slovenian', nameIt: 'Sloveno', namePl: 'Slowenski', speakers: 2.5 },
  { code: 'tr', nameEn: 'Turkish', nameIt: 'Turco', namePl: 'Turecki', speakers: 88 },

  // Regional (4 languages)
  { code: 'ca', nameEn: 'Catalan', nameIt: 'Catalano', namePl: 'Katalonski', speakers: 9 },
  { code: 'lv', nameEn: 'Latvian', nameIt: 'Lettone', namePl: 'Lotewski', speakers: 1.75 },
  { code: 'lt', nameEn: 'Lithuanian', nameIt: 'Lituano', namePl: 'Litewski', speakers: 3.2 },
];

/**
 * Get language name by locale
 * @param code ISO 639-1 language code
 * @param locale User's selected locale ('en', 'it', or 'pl')
 * @returns Localized language name
 */
export function getLanguageName(code: string, locale: Locale): string {
  const language = EUROPEAN_LANGUAGES.find(lang => lang.code === code);
  if (!language) return code;
  switch (locale) {
    case 'it': return language.nameIt;
    case 'pl': return language.namePl;
    default: return language.nameEn;
  }
}

/**
 * Validate language code exists in available languages
 * @param code ISO 639-1 language code
 * @returns True if language is available
 */
export function isValidLanguageCode(code: string): boolean {
  return EUROPEAN_LANGUAGES.some(lang => lang.code === code);
}