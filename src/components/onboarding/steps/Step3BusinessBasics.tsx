'use client'

import { useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Controller } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Building2, MapPin, Phone, Globe, Hash } from 'lucide-react'

import { TextInput } from '@/components/onboarding/form-fields/TextInput'
import { PhoneInput } from '@/components/onboarding/form-fields/PhoneInput'
import { DropdownInput } from '@/components/onboarding/form-fields/DropdownInput'
import { AddressAutocomplete } from '@/components/onboarding/AddressAutocomplete'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StepComponentProps } from './index'
import industriesData from '@/data/industries.json'

// Supported countries for business address
const countries = [
  { value: 'Italy', label: 'Italy', description: '🇮🇹 Italia' },
  { value: 'Poland', label: 'Poland', description: '🇵🇱 Polska' }
]

// Polish voivodeships (16 regions)
const polishVoivodeships = [
  { value: 'DS', label: 'Dolnoslaskie', description: 'Wroclaw' },
  { value: 'KP', label: 'Kujawsko-Pomorskie', description: 'Bydgoszcz' },
  { value: 'LU', label: 'Lubelskie', description: 'Lublin' },
  { value: 'LB', label: 'Lubuskie', description: 'Gorzow Wielkopolski' },
  { value: 'LD', label: 'Lodzkie', description: 'Lodz' },
  { value: 'MA', label: 'Malopolskie', description: 'Krakow' },
  { value: 'MZ', label: 'Mazowieckie', description: 'Warszawa' },
  { value: 'OP', label: 'Opolskie', description: 'Opole' },
  { value: 'PK', label: 'Podkarpackie', description: 'Rzeszow' },
  { value: 'PD', label: 'Podlaskie', description: 'Bialystok' },
  { value: 'PM', label: 'Pomorskie', description: 'Gdansk' },
  { value: 'SL', label: 'Slaskie', description: 'Katowice' },
  { value: 'SK', label: 'Swietokrzyskie', description: 'Kielce' },
  { value: 'WN', label: 'Warminsko-Mazurskie', description: 'Olsztyn' },
  { value: 'WP', label: 'Wielkopolskie', description: 'Poznan' },
  { value: 'ZP', label: 'Zachodniopomorskie', description: 'Szczecin' }
]

// Italian provinces (107 provinces) with their codes
const italianProvinces = [
  { value: 'AG', label: 'Agrigento', description: 'Sicilia' },
  { value: 'AL', label: 'Alessandria', description: 'Piemonte' },
  { value: 'AN', label: 'Ancona', description: 'Marche' },
  { value: 'AO', label: 'Aosta', description: "Valle d'Aosta" },
  { value: 'AR', label: 'Arezzo', description: 'Toscana' },
  { value: 'AP', label: 'Ascoli Piceno', description: 'Marche' },
  { value: 'AT', label: 'Asti', description: 'Piemonte' },
  { value: 'AV', label: 'Avellino', description: 'Campania' },
  { value: 'BA', label: 'Bari', description: 'Puglia' },
  { value: 'BT', label: 'Barletta-Andria-Trani', description: 'Puglia' },
  { value: 'BL', label: 'Belluno', description: 'Veneto' },
  { value: 'BN', label: 'Benevento', description: 'Campania' },
  { value: 'BG', label: 'Bergamo', description: 'Lombardia' },
  { value: 'BI', label: 'Biella', description: 'Piemonte' },
  { value: 'BO', label: 'Bologna', description: 'Emilia-Romagna' },
  { value: 'BZ', label: 'Bolzano', description: 'Trentino-Alto Adige' },
  { value: 'BS', label: 'Brescia', description: 'Lombardia' },
  { value: 'BR', label: 'Brindisi', description: 'Puglia' },
  { value: 'CA', label: 'Cagliari', description: 'Sardegna' },
  { value: 'CL', label: 'Caltanissetta', description: 'Sicilia' },
  { value: 'CB', label: 'Campobasso', description: 'Molise' },
  { value: 'CE', label: 'Caserta', description: 'Campania' },
  { value: 'CT', label: 'Catania', description: 'Sicilia' },
  { value: 'CZ', label: 'Catanzaro', description: 'Calabria' },
  { value: 'CH', label: 'Chieti', description: 'Abruzzo' },
  { value: 'CO', label: 'Como', description: 'Lombardia' },
  { value: 'CS', label: 'Cosenza', description: 'Calabria' },
  { value: 'CR', label: 'Cremona', description: 'Lombardia' },
  { value: 'KR', label: 'Crotone', description: 'Calabria' },
  { value: 'CN', label: 'Cuneo', description: 'Piemonte' },
  { value: 'EN', label: 'Enna', description: 'Sicilia' },
  { value: 'FM', label: 'Fermo', description: 'Marche' },
  { value: 'FE', label: 'Ferrara', description: 'Emilia-Romagna' },
  { value: 'FI', label: 'Firenze', description: 'Toscana' },
  { value: 'FG', label: 'Foggia', description: 'Puglia' },
  { value: 'FC', label: 'Forlì-Cesena', description: 'Emilia-Romagna' },
  { value: 'FR', label: 'Frosinone', description: 'Lazio' },
  { value: 'GE', label: 'Genova', description: 'Liguria' },
  { value: 'GO', label: 'Gorizia', description: 'Friuli-Venezia Giulia' },
  { value: 'GR', label: 'Grosseto', description: 'Toscana' },
  { value: 'IM', label: 'Imperia', description: 'Liguria' },
  { value: 'IS', label: 'Isernia', description: 'Molise' },
  { value: 'AQ', label: "L'Aquila", description: 'Abruzzo' },
  { value: 'SP', label: 'La Spezia', description: 'Liguria' },
  { value: 'LT', label: 'Latina', description: 'Lazio' },
  { value: 'LE', label: 'Lecce', description: 'Puglia' },
  { value: 'LC', label: 'Lecco', description: 'Lombardia' },
  { value: 'LI', label: 'Livorno', description: 'Toscana' },
  { value: 'LO', label: 'Lodi', description: 'Lombardia' },
  { value: 'LU', label: 'Lucca', description: 'Toscana' },
  { value: 'MC', label: 'Macerata', description: 'Marche' },
  { value: 'MN', label: 'Mantova', description: 'Lombardia' },
  { value: 'MS', label: 'Massa-Carrara', description: 'Toscana' },
  { value: 'MT', label: 'Matera', description: 'Basilicata' },
  { value: 'ME', label: 'Messina', description: 'Sicilia' },
  { value: 'MI', label: 'Milano', description: 'Lombardia' },
  { value: 'MO', label: 'Modena', description: 'Emilia-Romagna' },
  { value: 'MB', label: 'Monza e Brianza', description: 'Lombardia' },
  { value: 'NA', label: 'Napoli', description: 'Campania' },
  { value: 'NO', label: 'Novara', description: 'Piemonte' },
  { value: 'NU', label: 'Nuoro', description: 'Sardegna' },
  { value: 'OR', label: 'Oristano', description: 'Sardegna' },
  { value: 'PD', label: 'Padova', description: 'Veneto' },
  { value: 'PA', label: 'Palermo', description: 'Sicilia' },
  { value: 'PR', label: 'Parma', description: 'Emilia-Romagna' },
  { value: 'PV', label: 'Pavia', description: 'Lombardia' },
  { value: 'PG', label: 'Perugia', description: 'Umbria' },
  { value: 'PU', label: 'Pesaro e Urbino', description: 'Marche' },
  { value: 'PE', label: 'Pescara', description: 'Abruzzo' },
  { value: 'PC', label: 'Piacenza', description: 'Emilia-Romagna' },
  { value: 'PI', label: 'Pisa', description: 'Toscana' },
  { value: 'PT', label: 'Pistoia', description: 'Toscana' },
  { value: 'PN', label: 'Pordenone', description: 'Friuli-Venezia Giulia' },
  { value: 'PZ', label: 'Potenza', description: 'Basilicata' },
  { value: 'PO', label: 'Prato', description: 'Toscana' },
  { value: 'RG', label: 'Ragusa', description: 'Sicilia' },
  { value: 'RA', label: 'Ravenna', description: 'Emilia-Romagna' },
  { value: 'RC', label: 'Reggio Calabria', description: 'Calabria' },
  { value: 'RE', label: 'Reggio Emilia', description: 'Emilia-Romagna' },
  { value: 'RI', label: 'Rieti', description: 'Lazio' },
  { value: 'RN', label: 'Rimini', description: 'Emilia-Romagna' },
  { value: 'RM', label: 'Roma', description: 'Lazio' },
  { value: 'RO', label: 'Rovigo', description: 'Veneto' },
  { value: 'SA', label: 'Salerno', description: 'Campania' },
  { value: 'SS', label: 'Sassari', description: 'Sardegna' },
  { value: 'SV', label: 'Savona', description: 'Liguria' },
  { value: 'SI', label: 'Siena', description: 'Toscana' },
  { value: 'SR', label: 'Siracusa', description: 'Sicilia' },
  { value: 'SO', label: 'Sondrio', description: 'Lombardia' },
  { value: 'SU', label: 'Sud Sardegna', description: 'Sardegna' },
  { value: 'TA', label: 'Taranto', description: 'Puglia' },
  { value: 'TE', label: 'Teramo', description: 'Abruzzo' },
  { value: 'TR', label: 'Terni', description: 'Umbria' },
  { value: 'TO', label: 'Torino', description: 'Piemonte' },
  { value: 'TP', label: 'Trapani', description: 'Sicilia' },
  { value: 'TN', label: 'Trento', description: 'Trentino-Alto Adige' },
  { value: 'TV', label: 'Treviso', description: 'Veneto' },
  { value: 'TS', label: 'Trieste', description: 'Friuli-Venezia Giulia' },
  { value: 'UD', label: 'Udine', description: 'Friuli-Venezia Giulia' },
  { value: 'VA', label: 'Varese', description: 'Lombardia' },
  { value: 'VE', label: 'Venezia', description: 'Veneto' },
  { value: 'VB', label: 'Verbano-Cusio-Ossola', description: 'Piemonte' },
  { value: 'VC', label: 'Vercelli', description: 'Piemonte' },
  { value: 'VR', label: 'Verona', description: 'Veneto' },
  { value: 'VV', label: 'Vibo Valentia', description: 'Calabria' },
  { value: 'VI', label: 'Vicenza', description: 'Veneto' },
  { value: 'VT', label: 'Viterbo', description: 'Lazio' }
]

export interface Step3Props extends StepComponentProps {
  /** Detected country from geolocation (Vercel header) */
  detectedCountry?: 'Italy' | 'Poland'
}

export function Step3BusinessBasics({ form, errors, isLoading, detectedCountry }: Step3Props) {
  const t = useTranslations('onboarding.steps.3')
  const locale = useLocale()
  const { control, setValue, watch, trigger } = form

  const selectedIndustry = watch('industry')
  const businessCountry = watch('businessCountry')

  // Transform industries data based on locale
  const industries = useMemo(() => {
    return industriesData.map((industry) => ({
      value: industry.category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and'),
      label: locale === 'it' ? industry.category_it : industry.category,
      description: locale === 'it' ? industry.description_it : industry.description
    }))
  }, [locale])

  // Sort provinces alphabetically by label (full name)
  const sortedProvinces = useMemo(() => {
    return [...italianProvinces].sort((a, b) => a.label.localeCompare(b.label, 'it'))
  }, [])

  // Sort voivodeships alphabetically
  const sortedVoivodeships = useMemo(() => {
    return [...polishVoivodeships].sort((a, b) => a.label.localeCompare(b.label, 'pl'))
  }, [])

  // Get regions based on selected country
  const regionOptions = useMemo(() => {
    return businessCountry === 'Poland' ? sortedVoivodeships : sortedProvinces
  }, [businessCountry, sortedProvinces, sortedVoivodeships])

  // Get country code for Google Places API
  const addressCountryCode = useMemo(() => {
    return businessCountry === 'Poland' ? 'PL' : 'IT'
  }, [businessCountry])

  // Pre-select country on mount based on geolocation or default to Italy
  useEffect(() => {
    // Set country if the field is undefined or not yet set
    if (!businessCountry) {
      const defaultCountry = detectedCountry || 'Italy'
      setValue('businessCountry', defaultCountry, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
      // Trigger validation after a short delay to ensure the form is ready
      setTimeout(() => {
        trigger('businessCountry')
      }, 100)
    }
  }, [detectedCountry, businessCountry, setValue, trigger]) // Run on mount and when detectedCountry changes

  // Separate effect to ensure value persists if cleared
  useEffect(() => {
    if (!businessCountry) {
      const defaultCountry = detectedCountry || 'Italy'
      setValue('businessCountry', defaultCountry, { shouldValidate: false, shouldDirty: false })
    }
  }, [businessCountry, setValue, detectedCountry])

  // Clear province when country changes (different region types)
  useEffect(() => {
    // Only clear if we already have a province set from a different country
    const currentProvince = watch('businessProvince')
    if (currentProvince) {
      const isItalianProvince = italianProvinces.some(p => p.value === currentProvince)
      const isPolishVoivodeship = polishVoivodeships.some(p => p.value === currentProvince)

      // Clear province if switching countries and province belongs to old country
      if ((businessCountry === 'Poland' && isItalianProvince) ||
          (businessCountry === 'Italy' && isPolishVoivodeship)) {
        setValue('businessProvince', '', { shouldValidate: true })
        setValue('businessStreet', '', { shouldValidate: true })
        setValue('businessCity', '', { shouldValidate: true })
        setValue('businessPostalCode', '', { shouldValidate: true })
      }
    }
  }, [businessCountry, setValue, watch])

  const handleAddressSelect = (address: any) => {
    if (address) {
      setValue('businessStreet', address.formatted_address, { shouldValidate: true })
      setValue('businessCity', address.locality || '', { shouldValidate: true })
      setValue('businessPostalCode', address.postal_code || '', { shouldValidate: true })

      // Determine country from address or use current selection
      const addressCountry = address.country
      const isPoland = addressCountry === 'Poland' || addressCountry === 'Polska' || businessCountry === 'Poland'

      if (isPoland) {
        // For Poland: level_1 = Voivodeship (Mazowieckie), level_2 = County (Powiat)
        let voivodeshipName = address.administrative_area_level_1 || ''

        // Strip common prefixes that Google Maps might add
        voivodeshipName = voivodeshipName
          .replace(/^Voivodeship of\s+/i, '')
          .replace(/^Województwo\s+/i, '')
          .trim()

        // Try exact match on voivodeship label
        const matchingVoivodeship = polishVoivodeships.find(
          p => p.label.toLowerCase() === voivodeshipName.toLowerCase()
        )

        setValue('businessProvince', matchingVoivodeship?.value || '', { shouldValidate: true })
        setValue('businessCountry', 'Poland', { shouldValidate: true })
      } else {
        // For Italy: level_2 = Province (Vicenza, Milano), level_1 = Region (Veneto, Lombardia)
        let provinceName = address.administrative_area_level_2 || address.administrative_area_level_1 || ''

        // Strip common prefixes that Google Maps might add
        provinceName = provinceName
          .replace(/^Province of\s+/i, '')
          .replace(/^Provincia di\s+/i, '')
          .replace(/^Metropolitan City of\s+/i, '')
          .replace(/^Città Metropolitana di\s+/i, '')
          .trim()

        // Try exact match on province label first
        const matchingProvince = italianProvinces.find(
          p => p.label.toLowerCase() === provinceName.toLowerCase()
        )

        setValue('businessProvince', matchingProvince?.value || '', { shouldValidate: true })
        setValue('businessCountry', 'Italy', { shouldValidate: true })
      }

      // Trigger validation for all updated fields
      trigger(['businessStreet', 'businessCity', 'businessPostalCode', 'businessProvince', 'businessCountry'])
    }
  }

  return (
    <div className="space-y-8">
      {/* Business Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t('businessInfo.title')}</h2>
              <Badge variant="secondary" className="ml-auto">
                {t('businessInfo.required')}
              </Badge>
            </div>

            <div className="space-y-6">
              {/* Business Name */}
              <Controller
                name="businessName"
                control={control}
                render={({ field }) => (
                  <TextInput
                    {...field}
                    label={t('businessInfo.name.label')}
                    placeholder={t('businessInfo.name.placeholder')}
                    hint={t('businessInfo.name.hint')}
                    error={errors.businessName?.message}
                    required
                    disabled={isLoading}
                    leftIcon={<Building2 className="w-4 h-4" />}
                  />
                )}
              />

              {/* Industry */}
              <Controller
                name="industry"
                control={control}
                render={({ field }) => (
                  <DropdownInput
                    label={t('businessInfo.industry.label')}
                    placeholder={t('businessInfo.industry.placeholder')}
                    hint={t('businessInfo.industry.hint')}
                    options={industries}
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      trigger('industry')
                    }}
                    error={errors.industry?.message}
                    required
                    searchable
                    disabled={isLoading}
                    name="industry"
                  />
                )}
              />

              {/* Custom Industry (if Other selected) */}
              {selectedIndustry === 'other' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Controller
                    name="customIndustry"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        label={t('businessInfo.customIndustry.label')}
                        placeholder={t('businessInfo.customIndustry.placeholder')}
                        hint={t('businessInfo.customIndustry.hint')}
                        error={errors.customIndustry?.message}
                        required
                        disabled={isLoading}
                      />
                    )}
                  />
                </motion.div>
              )}

              {/* VAT Number (Italian specific) */}
              <Controller
                name="vatNumber"
                control={control}
                render={({ field }) => (
                  <TextInput
                    {...field}
                    label={t('businessInfo.vat.label')}
                    placeholder={t('businessInfo.vat.placeholder')}
                    hint={t('businessInfo.vat.hint')}
                    error={errors.vatNumber?.message}
                    disabled={isLoading}
                    leftIcon={<Hash className="w-4 h-4" />}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Contact Information */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t('contactInfo.title')}</h2>
              <Badge variant="secondary" className="ml-auto">
                {t('contactInfo.required')}
              </Badge>
            </div>

            <div className="space-y-6">
              {/* Phone Number */}
              <Controller
                name="businessPhone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    {...field}
                    label={t('contactInfo.phone.label')}
                    hint={t('contactInfo.phone.hint')}
                    error={errors.businessPhone?.message}
                    defaultCountry="IT"
                    required
                    disabled={isLoading}
                  />
                )}
              />

              {/* Website (optional) */}
              <Controller
                name="businessEmail"
                control={control}
                render={({ field }) => (
                  <TextInput
                    {...field}
                    label={t('contactInfo.email.label')}
                    placeholder={t('contactInfo.email.placeholder')}
                    hint={t('contactInfo.email.hint')}
                    error={errors.businessEmail?.message}
                    disabled={isLoading}
                    leftIcon={<Globe className="w-4 h-4" />}
                    type="email"
                    required
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Business Address */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t('address.title')}</h2>
              <Badge variant="secondary" className="ml-auto">
                {t('address.required')}
              </Badge>
            </div>

            <div className="space-y-6">
              {/* Address Autocomplete */}
              <Controller
                name="businessStreet"
                control={control}
                render={({ field }) => (
                  <AddressAutocomplete
                    label={t('address.street.label')}
                    name="businessStreet"
                    placeholder={t('address.street.placeholder')}
                    hint={t('address.street.hint')}
                    value={watch('businessStreet') ? {
                      formatted_address: watch('businessStreet'),
                      locality: watch('businessCity'),
                      administrative_area_level_1: watch('businessProvince'),
                      postal_code: watch('businessPostalCode'),
                      country: watch('businessCountry') || 'Italy'
                    } as any : undefined}
                    error={errors.businessStreet?.message}
                    required
                    country={addressCountryCode}
                    onAddressSelect={handleAddressSelect}
                    onAddressChange={(query) => {
                      field.onChange(query)
                    }}
                  />
                )}
              />

              {/* Additional Address Fields (populated by autocomplete) */}
              <div className="grid md:grid-cols-2 gap-4">
                <Controller
                  name="businessCity"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      {...field}
                      label={t('address.city.label')}
                      placeholder={t('address.city.placeholder')}
                      error={errors.businessCity?.message}
                      required
                      disabled={isLoading}
                      leftIcon={<MapPin className="w-4 h-4" />}
                    />
                  )}
                />

                <Controller
                  name="businessPostalCode"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      {...field}
                      label={t('address.postalCode.label')}
                      placeholder={t('address.postalCode.placeholder')}
                      error={errors.businessPostalCode?.message}
                      required
                      disabled={isLoading}
                      leftIcon={<Hash className="w-4 h-4" />}
                    />
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Controller
                  name="businessProvince"
                  control={control}
                  render={({ field }) => (
                    <DropdownInput
                      label={businessCountry === 'Poland' ? t('address.voivodeship.label') : t('address.region.label')}
                      placeholder={businessCountry === 'Poland' ? t('address.voivodeship.placeholder') : t('address.region.placeholder')}
                      options={regionOptions}
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        trigger('businessProvince')
                      }}
                      error={errors.businessProvince?.message}
                      required
                      searchable
                      clearable={false}
                      disabled={isLoading}
                      name="businessProvince"
                    />
                  )}
                />

                <Controller
                  name="businessCountry"
                  control={control}
                  defaultValue="Italy"
                  render={({ field }) => (
                    <DropdownInput
                      label={t('address.country.label')}
                      placeholder={t('address.country.placeholder')}
                      options={countries}
                      value={field.value || 'Italy'}
                      onValueChange={(value) => {
                        field.onChange(value)
                        // Trigger form validation after setting the value
                        trigger('businessCountry')
                      }}
                      searchable={false}
                      clearable={false}
                      disabled={isLoading}
                      name="businessCountry"
                    />
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Usage Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center text-sm text-muted-foreground"
      >
        <p>{t('dataUsage.notice')}</p>
      </motion.div>
    </div>
  )
}