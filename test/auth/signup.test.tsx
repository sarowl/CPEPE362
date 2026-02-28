import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'                  // ✅ MSW v2
import { setupServer } from 'msw/node'
import { useRouter } from 'next/navigation'
import SignupPage from '@/app/signup/page'

// ─── Mock Next.js router ───────────────────────────────────────────────────
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockPush = jest.fn()
const mockRouter = { push: mockPush, replace: jest.fn(), prefetch: jest.fn() }

// ─── MSW v2 server ────────────────────────────────────────────────────────
const server = setupServer(
  http.post('/api/auth/signup', async ({ request }) => {
    const body = await request.json() as { name: string; email: string; password: string }

    if (body.email === 'taken@autobot.io') {
      return HttpResponse.json({ message: 'Email already in use.' }, { status: 409 })
    }

    if (!body.name || !body.email || !body.password) {
      return HttpResponse.json({ message: 'All fields are required.' }, { status: 400 })
    }

    return HttpResponse.json(
      {
        token: 'mock-signup-jwt-token',
        user: { id: '99', name: body.name, email: body.email, role: 'user' },
      },
      { status: 201 }
    )
  })
)

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => { server.resetHandlers(); jest.clearAllMocks(); localStorage.clear() })
afterAll(() => server.close())

// ─── Helper ───────────────────────────────────────────────────────────────
const renderSignup = () => {
  ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  return render(
    <SignupPage />
  )
}

// ─── Reusable valid signup data ───────────────────────────────────────────
const VALID_USER = {
  name: 'Bumblebee',
  email: 'bumblebee@autobot.io',
  password: 'Energon@2024!',
}

const fillSignupForm = async (overrides: Partial<typeof VALID_USER> = {}) => {
  const data = { ...VALID_USER, ...overrides }
  if (data.name)     await userEvent.type(screen.getByLabelText(/full name/i), data.name)
  if (data.email)    await userEvent.type(screen.getByLabelText(/email/i), data.email)
  if (data.password) await userEvent.type(screen.getByLabelText(/^password/i), data.password)
}

// ══════════════════════════════════════════════════════════════════════════
//  SIGNUP TEST SUITE
// ══════════════════════════════════════════════════════════════════════════
describe('📝 Signup Page', () => {

  // ── RENDERING ────────────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('renders name, email, and password fields', () => {
      renderSignup()
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
    })

    it('renders a confirm password field', () => {
      renderSignup()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })

    it('renders the signup submit button', () => {
      renderSignup()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('renders OAuth signup buttons for Google and GitHub', () => {
      renderSignup()
      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument()
    })

    it('renders a link back to the login page', () => {
      renderSignup()
      expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login')
    })

    it('renders terms and conditions checkbox', () => {
      renderSignup()
      expect(screen.getByRole('checkbox', { name: /terms/i })).toBeInTheDocument()
    })
  })

  // ── FORM VALIDATION ───────────────────────────────────────────────────
  describe('Form Validation', () => {
    it('shows errors when submitting an empty form', async () => {
      renderSignup()
      await userEvent.click(screen.getByRole('button', { name: /create account/i }))
      expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
      expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
      expect(await screen.findByText(/password is required/i)).toBeInTheDocument()
    })

    it('shows error for invalid email format', async () => {
      renderSignup()
      await userEvent.type(screen.getByLabelText(/email/i), 'not-valid')
      await userEvent.click(screen.getByRole('button', { name: /create account/i }))
      expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument()
    })

    it('shows error when password is too short (< 8 chars)', async () => {
      renderSignup()
      await userEvent.type(screen.getByLabelText(/^password/i), 'abc')
      await userEvent.click(screen.getByRole('button', { name: /create account/i }))
      expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })

    it('shows error when password has no uppercase letter', async () => {
      renderSignup()
      await userEvent.type(screen.getByLabelText(/^password/i), 'alllower1!')
      await userEvent.click(screen.getByRole('button', { name: /create account/i }))
      expect(await screen.findByText(/must contain an uppercase letter/i)).toBeInTheDocument()
    })

    it('shows error when password has no number', async () => {
      renderSignup()
      await userEvent.type(screen.getByLabelText(/^password/i), 'NoNumber!')
      await userEvent.click(screen.getByRole('button', { name: /create account/i }))
      expect(await screen.findByText(/must contain a number/i)).toBeInTheDocument()
    })

    it('shows error when password has no special character', async () => {
      renderSignup()
      await userEvent.type(screen.getByLabelText(/^password/i), 'NoSpecial1')
      await userEvent.click(screen.getByRole('button', { name: /create account/i }))
      expect(await screen.findByText(/must contain a special character/i)).toBeInTheDocument()
    })

    it('shows error when passwords do not match', async () => {
      renderSignup()
      await userEvent.type(screen.getByLabelText(/^password/i), 'Energon@2024!')
      await userEvent.type(screen.getByLabelText(/confirm password/i), 'Different@2024!')
      await userEvent.click(screen.getByRole('button', { name: /create account/i }))
      expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    })

    it('shows error when name contains only whitespace', async () => {
      renderSignup()
      await userEvent.type(screen.getByLabelText(/full name/i), '   ')
      await userEvent.click(screen.getByRole('button', { name: /create account/i }))
      expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
    })

    it('shows error if terms checkbox is not checked', async () => {
      renderSignup()
      await fillSignupForm()
      await userEvent.type(screen.getByLabelText(/confirm password/i), VALID_USER.password)
      await userEvent.click(screen.getByRole('button', { name: /create account/i }))
      expect(await screen.findByText(/must accept terms/i)).toBeInTheDocument()
    })

    it('shows password strength indicator as user types', async () => {
      renderSignup()
      await userEvent.type(screen.getByLabelText(/^password/i), 'weak')
      expect(screen.getByText(/weak/i)).toBeInTheDocument()

      await userEvent.clear(screen.getByLabelText(/^password/i))
      await userEvent.type(screen.getByLabelText(/^password/i), 'Energon@2024!')
      expect(screen.getByText(/strong/i)).toBeInTheDocument()
    })
  })

  // ── SUCCESSFUL SIGNUP ─────────────────────────────────────────────────
  describe('Successful Signup', () => {
    const submitValidForm = async () => {
      renderSignup()
      await fillSignupForm()
      await userEvent.type(screen.getByLabelText(/confirm password/i), VALID_USER.password)
      await userEvent.click(screen.getByRole('checkbox', { name: /terms/i }))
      await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    }

    it('redirects to dashboard after successful signup', async () => {
      await submitValidForm()
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'))
    })

    it('stores JWT token in localStorage after signup', async () => {
      await submitValidForm()
      await waitFor(() =>
        expect(localStorage.getItem('autobot_token')).toBe('mock-signup-jwt-token')
      )
    })

    it('shows loading state while request is processing', async () => {
      renderSignup()
      await fillSignupForm()
      await userEvent.type(screen.getByLabelText(/confirm password/i), VALID_USER.password)
      await userEvent.click(screen.getByRole('checkbox', { name: /terms/i }))
      userEvent.click(screen.getByRole('button', { name: /create account/i }))
      expect(await screen.findByRole('status')).toBeInTheDocument()
    })

    it('disables submit button while loading', async () => {
      renderSignup()
      await fillSignupForm()
      await userEvent.type(screen.getByLabelText(/confirm password/i), VALID_USER.password)
      await userEvent.click(screen.getByRole('checkbox', { name: /terms/i }))
      userEvent.click(screen.getByRole('button', { name: /create account/i }))
      expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()
    })
  })

  // ── FAILED SIGNUP ─────────────────────────────────────────────────────
  describe('Failed Signup', () => {
    it('shows error when email is already taken', async () => {
      renderSignup()
      await fillSignupForm({ email: 'taken@autobot.io' })
      await userEvent.type(screen.getByLabelText(/confirm password/i), VALID_USER.password)
      await userEvent.click(screen.getByRole('checkbox', { name: /terms/i }))
      await userEvent.click(screen.getByRole('button', { name: /create account/i }))
      expect(await screen.findByText(/email already in use/i)).toBeInTheDocument()
    })

    it('does not redirect on failed signup', async () => {
      renderSignup()
      await fillSignupForm({ email: 'taken@autobot.io' })
      await userEvent.type(screen.getByLabelText(/confirm password/i), VALID_USER.password)
      await userEvent.click(screen.getByRole('checkbox', { name: /terms/i }))
      await userEvent.click(screen.getByRole('button', { name: /create account/i }))
      await waitFor(() => expect(mockPush).not.toHaveBeenCalled())
    })

    it('shows generic error message on network failure', async () => {
      server.use(
        http.post('/api/auth/signup', () => HttpResponse.error()) // ✅ MSW v2 network error
      )
      renderSignup()
      await fillSignupForm()
      await userEvent.type(screen.getByLabelText(/confirm password/i), VALID_USER.password)
      await userEvent.click(screen.getByRole('checkbox', { name: /terms/i }))
      await userEvent.click(screen.getByRole('button', { name: /create account/i }))
      expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
    })
  })

  // ── OAUTH ─────────────────────────────────────────────────────────────
  describe('OAuth Signup', () => {
    it('Google signup button is clickable and enabled', async () => {
      renderSignup()
      const googleBtn = screen.getByRole('button', { name: /google/i })
      expect(googleBtn).toBeEnabled()
      await userEvent.click(googleBtn)
    })

    it('GitHub signup button is clickable and enabled', async () => {
      renderSignup()
      const githubBtn = screen.getByRole('button', { name: /github/i })
      expect(githubBtn).toBeEnabled()
      await userEvent.click(githubBtn)
    })
  })

  // ── JWT SESSION ───────────────────────────────────────────────────────
  describe('JWT Session', () => {
    it('redirects already-authenticated users away from signup', () => {
      localStorage.setItem('autobot_token', 'existing-valid-token')
      renderSignup()
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  // ── ACCESSIBILITY ─────────────────────────────────────────────────────
  describe('Accessibility', () => {
    it('name field is focused on page load', () => {
      renderSignup()
      expect(screen.getByLabelText(/full name/i)).toHaveFocus()
    })

    it('can tab through all form fields in logical order', async () => {
      renderSignup()
      await userEvent.tab()
      expect(screen.getByLabelText(/full name/i)).toHaveFocus()
      await userEvent.tab()
      expect(screen.getByLabelText(/email/i)).toHaveFocus()
      await userEvent.tab()
      expect(screen.getByLabelText(/^password/i)).toHaveFocus()
      await userEvent.tab()
      expect(screen.getByLabelText(/confirm password/i)).toHaveFocus()
    })

    it('password fields have type="password" (values are hidden)', () => {
      renderSignup()
      expect(screen.getByLabelText(/^password/i)).toHaveAttribute('type', 'password')
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('type', 'password')
    })

    it('toggle show/hide password reveals both password fields', async () => {
      renderSignup()
      const toggle = screen.getByRole('button', { name: /show password/i })
      await userEvent.click(toggle)
      expect(screen.getByLabelText(/^password/i)).toHaveAttribute('type', 'text')
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('type', 'text')
    })

    it('form has no accessibility violations (basic checks)', () => {
      renderSignup()
      const form = screen.getByRole('form')
      expect(form).toBeInTheDocument()
      screen.getAllByRole('textbox').forEach((input) => {
        expect(input).toHaveAccessibleName()
      })
    })
  })
})