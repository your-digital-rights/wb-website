import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useForm, FormProvider } from 'react-hook-form'
import { NextIntlClientProvider } from 'next-intl'
import { Step10ColorPalette } from '@/components/onboarding/steps/Step10ColorPalette'

// Mock translations
const messages = {
  onboarding: {
    steps: {
      '10': {
        intro: {
          title: 'Color Palette Selection',
          description: 'Colors play a crucial role in how customers perceive your brand.'
        },
        customColors: {
          title: 'Customize Your Brand Colors',
          description: 'Select or customize the four core colors for your brand.',
          labels: {
            primary: 'Primary',
            secondary: 'Secondary',
            accent: 'Accent',
            background: 'Background'
          },
          empty: 'Select Color',
          clear: 'Clear',
          done: 'Done',
          hint: 'All colors are optional.'
        },
        selection: {
          title: 'Choose Your Color Palette',
          optional: 'Optional'
        },
        psychology: {
          title: 'Color Psychology',
          emotional: {
            title: 'Emotional Impact',
            trust: 'Blue builds trust',
            energy: 'Red creates energy',
            calm: 'Green promotes calm',
            luxury: 'Purple conveys luxury'
          },
          business: {
            title: 'Business Benefits',
            conversion: 'Right colors increase conversion',
            branding: 'Consistent colors improve recognition',
            accessibility: 'Proper contrast ensures accessibility',
            recognition: 'Signature colors make brand memorable'
          }
        },
        accessibility: {
          title: 'Accessibility & Standards',
          description: 'We ensure all color combinations meet standards.',
          contrast: 'Minimum 4.5:1 contrast ratio',
          colorBlind: 'Color schemes work for color-blind users',
          consistency: 'Consistent color usage'
        },
        tips: {
          title: 'Choose colors that:',
          emotion: 'Match your brand emotion',
          industry: 'Fit your industry',
          accessible: 'Are accessible to all'
        }
      }
    }
  },
  forms: {
    colorPalette: {
      preview: 'Preview',
      selectedPalette: 'Selected Palette',
      colors: 'Colors',
      usage: 'Usage',
      noPalettes: 'No palettes available',
      all: 'All',
      uncategorized: 'Uncategorized',
      required: 'Required'
    }
  }
}

// Wrapper component with form provider
function TestWrapper({ children, defaultValues = {} }: any) {
  const methods = useForm({
    defaultValues: {
      colorPalette: [],
      ...defaultValues
    }
  })

  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <FormProvider {...methods}>
        {children}
      </FormProvider>
    </NextIntlClientProvider>
  )
}

describe('Step10ColorPalette', () => {
  const mockForm = {
    control: {} as any,
    setValue: jest.fn(),
    watch: jest.fn(() => []),
    formState: { errors: {} }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the component with all sections', () => {
    render(
      <TestWrapper>
        <Step10ColorPalette form={mockForm} errors={{}} isLoading={false} />
      </TestWrapper>
    )

    // Check main sections
    expect(screen.getByText('Color Palette Selection')).toBeInTheDocument()
    expect(screen.getByText('Customize Your Brand Colors')).toBeInTheDocument()
    expect(screen.getByText('Choose Your Color Palette')).toBeInTheDocument()
    expect(screen.getByText('Color Psychology')).toBeInTheDocument()
    expect(screen.getByText('Accessibility & Standards')).toBeInTheDocument()
  })

  it('shows custom color selector as always visible', () => {
    render(
      <TestWrapper>
        <Step10ColorPalette form={mockForm} errors={{}} isLoading={false} />
      </TestWrapper>
    )

    // Custom color section should always be visible
    expect(screen.getByText('Customize Your Brand Colors')).toBeInTheDocument()
    expect(screen.getByText('Primary')).toBeInTheDocument()
    expect(screen.getByText('Secondary')).toBeInTheDocument()
    expect(screen.getByText('Accent')).toBeInTheDocument()
    expect(screen.getByText('Background')).toBeInTheDocument()
  })

  it('shows empty state for color selectors when no colors selected', () => {
    render(
      <TestWrapper>
        <Step10ColorPalette form={mockForm} errors={{}} isLoading={false} />
      </TestWrapper>
    )

    // Should show "Select Color" text for empty selectors
    const selectColorButtons = screen.getAllByText('Select Color')
    expect(selectColorButtons.length).toBeGreaterThan(0)
  })

  it('populates color selectors from form data', () => {
    const mockFormWithColors = {
      ...mockForm,
      watch: jest.fn(() => ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF'])
    }

    render(
      <TestWrapper defaultValues={{ colorPalette: ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF'] }}>
        <Step10ColorPalette form={mockFormWithColors} errors={{}} isLoading={false} />
      </TestWrapper>
    )

    // Colors should be displayed
    expect(screen.getByText('#FF0000')).toBeInTheDocument()
    expect(screen.getByText('#00FF00')).toBeInTheDocument()
    expect(screen.getByText('#0000FF')).toBeInTheDocument()
    expect(screen.getByText('#FFFFFF')).toBeInTheDocument()
  })

  it('does NOT show Industry Color Trends section', () => {
    render(
      <TestWrapper>
        <Step10ColorPalette form={mockForm} errors={{}} isLoading={false} />
      </TestWrapper>
    )

    // Industry Color Trends should be removed
    expect(screen.queryByText('Industry Color Trends')).not.toBeInTheDocument()
    expect(screen.queryByText('Finance & Banking')).not.toBeInTheDocument()
    expect(screen.queryByText('Health & Wellness')).not.toBeInTheDocument()
    expect(screen.queryByText('Technology')).not.toBeInTheDocument()
  })

  it('shows Color Psychology section', () => {
    render(
      <TestWrapper>
        <Step10ColorPalette form={mockForm} errors={{}} isLoading={false} />
      </TestWrapper>
    )

    expect(screen.getByText('Color Psychology')).toBeInTheDocument()
    expect(screen.getByText('Emotional Impact')).toBeInTheDocument()
    expect(screen.getByText('Business Benefits')).toBeInTheDocument()
  })

  it('shows Accessibility section', () => {
    render(
      <TestWrapper>
        <Step10ColorPalette form={mockForm} errors={{}} isLoading={false} />
      </TestWrapper>
    )

    expect(screen.getByText('Accessibility & Standards')).toBeInTheDocument()
    expect(screen.getByText(/Minimum 4.5:1 contrast ratio/)).toBeInTheDocument()
  })

  it('shows palette selection as optional', () => {
    render(
      <TestWrapper>
        <Step10ColorPalette form={mockForm} errors={{}} isLoading={false} />
      </TestWrapper>
    )

    expect(screen.getByText('Optional')).toBeInTheDocument()
  })

  it('validates empty color array is allowed', () => {
    const mockFormEmpty = {
      ...mockForm,
      watch: jest.fn(() => [])
    }

    render(
      <TestWrapper>
        <Step10ColorPalette form={mockFormEmpty} errors={{}} isLoading={false} />
      </TestWrapper>
    )

    // Should render without errors
    expect(screen.getByText('Customize Your Brand Colors')).toBeInTheDocument()
  })

  it('has search functionality for palettes', () => {
    render(
      <TestWrapper>
        <Step10ColorPalette form={mockForm} errors={{}} isLoading={false} />
      </TestWrapper>
    )

    const searchInput = screen.getByPlaceholderText(/Search palettes/)
    expect(searchInput).toBeInTheDocument()

    // Type in search
    fireEvent.change(searchInput, { target: { value: 'blue' } })
    expect(searchInput).toHaveValue('blue')
  })
})
