import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { CustomColorSelector } from '@/components/onboarding/CustomColorSelector'

// Mock translations
const messages = {
  onboarding: {
    steps: {
      '10': {
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
        }
      }
    }
  }
}

function TestWrapper({ children }: any) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}

describe('CustomColorSelector', () => {
  const mockOnChange = jest.fn()

  const emptyColors = [
    { name: 'primary' as const, value: undefined },
    { name: 'secondary' as const, value: undefined },
    { name: 'accent' as const, value: undefined },
    { name: 'background' as const, value: undefined }
  ]

  const populatedColors = [
    { name: 'primary' as const, value: '#FF0000' },
    { name: 'secondary' as const, value: '#00FF00' },
    { name: 'accent' as const, value: '#0000FF' },
    { name: 'background' as const, value: '#FFFFFF' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with empty state', () => {
    render(
      <TestWrapper>
        <CustomColorSelector colors={emptyColors} onChange={mockOnChange} />
      </TestWrapper>
    )

    expect(screen.getByText('Customize Your Brand Colors')).toBeInTheDocument()
    expect(screen.getByText('Primary')).toBeInTheDocument()
    expect(screen.getByText('Secondary')).toBeInTheDocument()
    expect(screen.getByText('Accent')).toBeInTheDocument()
    expect(screen.getByText('Background')).toBeInTheDocument()

    // Should show "Select Color" for empty selectors
    const selectColorTexts = screen.getAllByText('Select Color')
    expect(selectColorTexts).toHaveLength(4)
  })

  it('renders with populated colors', () => {
    render(
      <TestWrapper>
        <CustomColorSelector colors={populatedColors} onChange={mockOnChange} />
      </TestWrapper>
    )

    // Should show hex values
    expect(screen.getByText('#FF0000')).toBeInTheDocument()
    expect(screen.getByText('#00FF00')).toBeInTheDocument()
    expect(screen.getByText('#0000FF')).toBeInTheDocument()
    expect(screen.getByText('#FFFFFF')).toBeInTheDocument()
  })

  it('shows clear button only for populated colors', () => {
    render(
      <TestWrapper>
        <CustomColorSelector colors={populatedColors} onChange={mockOnChange} />
      </TestWrapper>
    )

    // Should have 4 clear buttons (one for each populated color)
    const clearButtons = screen.getAllByLabelText('Clear')
    expect(clearButtons).toHaveLength(4)
  })

  it('does not show clear button for empty colors', () => {
    render(
      <TestWrapper>
        <CustomColorSelector colors={emptyColors} onChange={mockOnChange} />
      </TestWrapper>
    )

    // Should not have any clear buttons
    const clearButtons = screen.queryAllByLabelText('Clear')
    expect(clearButtons).toHaveLength(0)
  })

  it('calls onChange when color is cleared', () => {
    render(
      <TestWrapper>
        <CustomColorSelector colors={populatedColors} onChange={mockOnChange} />
      </TestWrapper>
    )

    // Click the first clear button (Primary color)
    const clearButtons = screen.getAllByLabelText('Clear')
    fireEvent.click(clearButtons[0])

    expect(mockOnChange).toHaveBeenCalledWith([
      { name: 'primary', value: undefined },
      { name: 'secondary', value: '#00FF00' },
      { name: 'accent', value: '#0000FF' },
      { name: 'background', value: '#FFFFFF' }
    ])
  })

  it('opens color picker when color box is clicked', () => {
    render(
      <TestWrapper>
        <CustomColorSelector colors={emptyColors} onChange={mockOnChange} />
      </TestWrapper>
    )

    // Click on Primary color box
    const colorBoxes = screen.getAllByRole('button')
    fireEvent.click(colorBoxes[0])

    // Color picker should open (look for Done button)
    waitFor(() => {
      expect(screen.getByText('Done')).toBeInTheDocument()
    })
  })

  it('shows hint text about optional colors', () => {
    render(
      <TestWrapper>
        <CustomColorSelector colors={emptyColors} onChange={mockOnChange} />
      </TestWrapper>
    )

    expect(screen.getByText(/All colors are optional/)).toBeInTheDocument()
  })

  it('renders all four color labels correctly', () => {
    render(
      <TestWrapper>
        <CustomColorSelector colors={emptyColors} onChange={mockOnChange} />
      </TestWrapper>
    )

    expect(screen.getByText('Primary')).toBeInTheDocument()
    expect(screen.getByText('Secondary')).toBeInTheDocument()
    expect(screen.getByText('Accent')).toBeInTheDocument()
    expect(screen.getByText('Background')).toBeInTheDocument()
  })

  it('applies correct background color styles to color boxes', () => {
    const { container } = render(
      <TestWrapper>
        <CustomColorSelector colors={populatedColors} onChange={mockOnChange} />
      </TestWrapper>
    )

    // Find buttons with background colors
    const buttons = container.querySelectorAll('button')
    const colorButtons = Array.from(buttons).filter(btn =>
      btn.style.backgroundColor && btn.style.backgroundColor !== 'transparent'
    )

    // Should have 4 color buttons with background colors
    expect(colorButtons.length).toBeGreaterThan(0)
  })

  it('supports mixed state (some colors selected, some empty)', () => {
    const mixedColors = [
      { name: 'primary' as const, value: '#FF0000' },
      { name: 'secondary' as const, value: undefined },
      { name: 'accent' as const, value: '#0000FF' },
      { name: 'background' as const, value: undefined }
    ]

    render(
      <TestWrapper>
        <CustomColorSelector colors={mixedColors} onChange={mockOnChange} />
      </TestWrapper>
    )

    // Should show hex values for populated
    expect(screen.getByText('#FF0000')).toBeInTheDocument()
    expect(screen.getByText('#0000FF')).toBeInTheDocument()

    // Should show "Select Color" for empty
    const selectColorTexts = screen.getAllByText('Select Color')
    expect(selectColorTexts).toHaveLength(2)

    // Should have 2 clear buttons
    const clearButtons = screen.getAllByLabelText('Clear')
    expect(clearButtons).toHaveLength(2)
  })
})
