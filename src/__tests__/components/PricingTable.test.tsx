import { render, screen, fireEvent } from '@testing-library/react'
import { PricingTable } from '@/components/PricingTable'

// Mock next-intl to return translation keys
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key
}))

// Mock the usePricing hook to avoid async state updates
jest.mock('@/hooks/usePricing', () => ({
  usePricing: () => ({
    prices: {
      basePackage: {
        priceId: 'price_test',
        amount: 3500,
        currency: 'eur',
        interval: 'month'
      },
      languageAddOn: {
        priceId: 'price_addon_test',
        amount: 7500,
        currency: 'eur'
      }
    },
    isLoading: false,
    error: null,
    basePackagePrice: '€35',
    basePackagePricePerMonth: '€35 / month',
    languageAddOnPrice: '€75'
  })
}))

// Mock window.location
const mockLocationAssign = jest.fn()
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true
})

describe('PricingTable', () => {
  beforeEach(() => {
    mockLocationAssign.mockClear()
    window.location.href = ''
  })

  it('renders pricing section', () => {
    render(<PricingTable />)

    expect(screen.getByText('title')).toBeInTheDocument()
    expect(screen.getByText('fast.name')).toBeInTheDocument()
    expect(screen.getByText('custom.name')).toBeInTheDocument()
  })

  it('displays plan details correctly', () => {
    render(<PricingTable />)

    // Fast & Simple plan
    expect(screen.getByText('fast.tagline')).toBeInTheDocument()
    // Price is fetched from pricing hook, just check structure exists
    expect(screen.getByText('fast.name')).toBeInTheDocument()

    // Custom Made plan
    expect(screen.getByText('custom.tagline')).toBeInTheDocument()
    expect(screen.getByText('custom.name')).toBeInTheDocument()
  })

  it('shows features for each plan', () => {
    render(<PricingTable />)

    // Check if features are displayed (they come from translation keys)
    expect(screen.getByText('fast.feature1')).toBeInTheDocument()
    expect(screen.getByText('custom.feature5')).toBeInTheDocument()
  })

  it('has CTA links for both plans', () => {
    render(<PricingTable />)

    const links = screen.getAllByRole('link', { name: /Start with/i })

    // Should have at least 2 CTA links (one for each plan)
    expect(links.length).toBeGreaterThanOrEqual(2)
  })

  it('has correct href for plan links', () => {
    render(<PricingTable />)

    const links = screen.getAllByRole('link', { name: /Start with/i })

    // First link should be Fast & Simple (goes to onboarding)
    expect(links[0]).toHaveAttribute('href', '/onboarding')
    // Second link should be Custom Made (goes to custom-software)
    expect(links[1]).toHaveAttribute('href', '/custom-software')
  })

  it('shows popular badge on fast plan', () => {
    render(<PricingTable />)

    // Popular badge is hardcoded in the component, not translated
    const popularBadge = screen.queryByText('Most Popular')
    // Badge might not always be present, so we just check the structure exists
    expect(popularBadge).toBeTruthy()
  })

  it('has proper section id for navigation', () => {
    render(<PricingTable />)
    
    const section = document.querySelector('#pricing')
    expect(section).toBeInTheDocument()
  })

  it('has accessible structure', () => {
    render(<PricingTable />)

    const heading = screen.getByRole('heading', { name: 'title' })
    expect(heading).toBeInTheDocument()

    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })
})