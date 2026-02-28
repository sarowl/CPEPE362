import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'                  // ✅ MSW v2
import { setupServer } from 'msw/node'
import { useRouter } from 'next/navigation'
import LoginPage from '@/app/login/page'

// ─── Mock Next.js router ───────────────────────────────────────────────────
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockPush = jest.fn()
const mockRouter = { push: mockPush, replace: jest.fn(), prefetch: jest.fn() }

// ─── MSW v2 server ────────────────────────────────────────────────────────
const server = setupServer(
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }

    if (body.email === 'optimus@autobot.io' && body.password === 'Allspark@2024') {
      return HttpResponse.json(
        {
          token: 'mock-jwt-token-xyz',
          user: { id: '1', name: 'Optimus Prime', email: body.email, role: 'admin' },
        },
        { status: 200 }
      )
    }

    if (body.email === 'decepticon@evil.io') {
      return HttpResponse.json({ message: 'Account suspended.' }, { status: 403 })
    }

    return HttpResponse.json({ message: 'Invalid email or password.' }, { status: 401 })
  })
)

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => { server.resetHandlers(); jest.clearAllMocks() })
afterAll(() => server.close())

// ─── Helper ───────────────────────────────────────────────────────────────
const renderLogin = () => {
  ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  return render(
    <LoginPage />
  )
}

// ══════════════════════════════════════════════════════════════════════════
//  LOGIN TEST SUITE
// ══════════════════════════════════════════════════════════════════════════
describe('🔐 Login Page', () => {

  // ── RENDERING ────────────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('renders email and password fields', () => {
      renderLogin()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    it('renders the login submit button', () => {
      renderLogin()
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
    })

    it('renders OAuth buttons for Google and GitHub', () => {
      renderLogin()
      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument()
    })

    it('renders a link to the signup page', () => {
      renderLogin()
      expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/signup')
    })

    it('renders forgot password link', () => {
      renderLogin()
      expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument()
    })
  })

  // ── FORM VALIDATION ───────────────────────────────────────────────────
  describe('Form Validation', () => {
    it('shows error when submitting with empty fields', async () => {
      renderLogin()
      await userEvent.click(screen.getByRole('button', { name: /log in/i }))
      expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
      expect(await screen.findByText(/password is required/i)).toBeInTheDocument()
    })

    it('shows error for invalid email format', async () => {
      renderLogin()
      await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email')
      await userEvent.click(screen.getByRole('button', { name: /log in/i }))
      expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument()
    })

    it('shows error when password is fewer than 8 characters', async () => {
      renderLogin()
      await userEvent.type(screen.getByLabelText(/email/i), 'optimus@autobot.io')
      await userEvent.type(screen.getByLabelText(/password/i), 'short')
      await userEvent.click(screen.getByRole('button', { name: /log in/i }))
      expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })

    it('does not show validation errors when fields are valid', async () => {
      renderLogin()
      await userEvent.type(screen.getByLabelText(/email/i), 'optimus@autobot.io')
      await userEvent.type(screen.getByLabelText(/password/i), 'Allspark@2024')
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/password is required/i)).not.toBeInTheDocument()
    })
  })

  // ── SUCCESSFUL LOGIN ──────────────────────────────────────────────────
  describe('Successful Login', () => {
    it('redirects to dashboard after successful login', async () => {
      renderLogin()
      await userEvent.type(screen.getByLabelText(/email/i), 'optimus@autobot.io')
      await userEvent.type(screen.getByLabelText(/password/i), 'Allspark@2024')
      await userEvent.click(screen.getByRole('button', { name: /log in/i }))
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'))
    })

    it('stores JWT token in localStorage after successful login', async () => {
      renderLogin()
      await userEvent.type(screen.getByLabelText(/email/i), 'optimus@autobot.io')
      await userEvent.type(screen.getByLabelText(/password/i), 'Allspark@2024')
      await userEvent.click(screen.getByRole('button', { name: /log in/i }))
      await waitFor(() =>
        expect(localStorage.getItem('autobot_token')).toBe('mock-jwt-token-xyz')
      )
    })

    it('shows a loading spinner while request is in progress', async () => {
      renderLogin()
      await userEvent.type(screen.getByLabelText(/email/i), 'optimus@autobot.io')
      await userEvent.type(screen.getByLabelText(/password/i), 'Allspark@2024')
      fireEvent.click(screen.getByRole('button', { name: /log in/i }))
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('disables the submit button while loading', async () => {
      renderLogin()
      await userEvent.type(screen.getByLabelText(/email/i), 'optimus@autobot.io')
      await userEvent.type(screen.getByLabelText(/password/i), 'Allspark@2024')
      fireEvent.click(screen.getByRole('button', { name: /log in/i }))
      expect(screen.getByRole('button', { name: /log in/i })).toBeDisabled()
    })
  })

  // ── FAILED LOGIN ──────────────────────────────────────────────────────
  describe('Failed Login', () => {
    it('shows error message on invalid credentials', async () => {
      renderLogin()
      await userEvent.type(screen.getByLabelText(/email/i), 'wrong@autobot.io')
      await userEvent.type(screen.getByLabelText(/password/i), 'WrongPass1!')
      await userEvent.click(screen.getByRole('button', { name: /log in/i }))
      expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument()
    })

    it('shows suspended message for banned accounts', async () => {
      renderLogin()
      await userEvent.type(screen.getByLabelText(/email/i), 'decepticon@evil.io')
      await userEvent.type(screen.getByLabelText(/password/i), 'SomePass1!')
      await userEvent.click(screen.getByRole('button', { name: /log in/i }))
      expect(await screen.findByText(/account suspended/i)).toBeInTheDocument()
    })

    it('does not redirect on failed login', async () => {
      renderLogin()
      await userEvent.type(screen.getByLabelText(/email/i), 'wrong@autobot.io')
      await userEvent.type(screen.getByLabelText(/password/i), 'BadPass99!')
      await userEvent.click(screen.getByRole('button', { name: /log in/i }))
      await waitFor(() => expect(mockPush).not.toHaveBeenCalled())
    })

    it('shows error on network failure', async () => {
      server.use(
        http.post('/api/auth/login', () => HttpResponse.error()) // ✅ MSW v2 network error
      )
      renderLogin()
      await userEvent.type(screen.getByLabelText(/email/i), 'optimus@autobot.io')
      await userEvent.type(screen.getByLabelText(/password/i), 'Allspark@2024')
      await userEvent.click(screen.getByRole('button', { name: /log in/i }))
      expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
    })
  })

  // ── OAUTH ─────────────────────────────────────────────────────────────
  describe('OAuth Login', () => {
    it('Google button is enabled and clickable', async () => {
      renderLogin()
      const googleBtn = screen.getByRole('button', { name: /google/i })
      expect(googleBtn).toBeEnabled()
      await userEvent.click(googleBtn)
    })

    it('GitHub button is enabled and clickable', async () => {
      renderLogin()
      const githubBtn = screen.getByRole('button', { name: /github/i })
      expect(githubBtn).toBeEnabled()
      await userEvent.click(githubBtn)
    })
  })

  // ── JWT SESSION ───────────────────────────────────────────────────────
  describe('JWT Session', () => {
    afterEach(() => localStorage.clear())

    it('redirects authenticated users away from login page', () => {
      localStorage.setItem('autobot_token', 'existing-valid-token')
      renderLogin()
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('stays on login page when token is expired', () => {
      localStorage.setItem('autobot_token', 'expired-token')
      renderLogin()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })
  })

  // ── ACCESSIBILITY ─────────────────────────────────────────────────────
  describe('Accessibility', () => {
    it('email field is focused on page load', () => {
      renderLogin()
      expect(screen.getByLabelText(/email/i)).toHaveFocus()
    })

    it('can submit the form using keyboard Enter key', async () => {
      renderLogin()
      await userEvent.type(screen.getByLabelText(/email/i), 'optimus@autobot.io')
      await userEvent.type(screen.getByLabelText(/password/i), 'Allspark@2024{enter}')
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'))
    })

    it('password field type is password (value is hidden)', () => {
      renderLogin()
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password')
    })

    it('toggle show/hide password changes input type to text', async () => {
      renderLogin()
      const toggle = screen.getByRole('button', { name: /show password/i })
      await userEvent.click(toggle)
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'text')
    })
  })
})