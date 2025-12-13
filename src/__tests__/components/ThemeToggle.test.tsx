import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '@/components/ThemeToggle'

// Mock next-intl to return translation keys
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key
}))

// Mock theme provider context
const mockSetTheme = jest.fn()
jest.mock('@/components/theme-provider', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: mockSetTheme
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Theme functionality disabled - all visitors use light theme
describe.skip('ThemeToggle', () => {
  beforeEach(() => {
    mockSetTheme.mockClear()
  })

  it('renders theme toggle button', () => {
    render(<ThemeToggle />)

    const toggleButton = screen.getByRole('button')
    expect(toggleButton).toBeInTheDocument()
    // Theme toggle might use a specific translation key or screen reader text
    // The actual text depends on the component implementation
  })

  it('renders with proper structure', async () => {
    render(<ThemeToggle />)
    
    const toggleButton = screen.getByRole('button')
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
    expect(toggleButton).toHaveAttribute('aria-haspopup', 'menu')
    
    // Sun icon should be visible by default (light theme)
    const sunIcon = document.querySelector('.lucide-sun')
    expect(sunIcon).toBeInTheDocument()
    
    // Moon icon should be present but hidden
    const moonIcon = document.querySelector('.lucide-moon')
    expect(moonIcon).toBeInTheDocument()
  })

  it('has proper ARIA labels', () => {
    render(<ThemeToggle />)
    
    const toggleButton = screen.getByRole('button')
    expect(toggleButton).toHaveAttribute('aria-expanded')
  })
})