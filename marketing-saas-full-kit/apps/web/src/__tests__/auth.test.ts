import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const redirectMock = vi.fn((location: string) => {
  throw new Error(`REDIRECT:${location}`)
})

const middlewareMock = vi.fn()
const getSessionMock = vi.fn()
const upsertFromAuth0Mock = vi.fn()

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/lib/auth0', () => ({
  auth0: {
    middleware: middlewareMock,
    getSession: getSessionMock,
  },
}))

vi.mock('@/lib/services/UserService', () => ({
  UserService: {
    upsertFromAuth0: upsertFromAuth0Mock,
  },
}))

describe('auth flow', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders a login page that points sign-in to the Auth0 route', async () => {
    const { default: LoginPage } = await import('@/app/(auth)/login/page')

    const markup = renderToStaticMarkup(createElement(LoginPage))

    expect(markup).toContain('/api/auth/login')
    expect(markup).toContain('Sign in')
  })

  it('delegates /api/auth/login to the Auth0 middleware redirect', async () => {
    middlewareMock.mockResolvedValue(NextResponse.redirect('https://tenant.auth0.com/authorize'))

    const { GET } = await import('@/app/api/auth/[auth0]/route')
    const response = await GET(new Request('http://localhost:3000/api/auth/login'))

    expect(middlewareMock).toHaveBeenCalledTimes(1)
    expect(response.headers.get('location')).toBe('https://tenant.auth0.com/authorize')
  })

  it('syncs the local user during the Auth0 callback and redirects into the app', async () => {
    vi.stubEnv('AUTH0_BASE_URL', 'http://localhost:3000')

    const { onAuthCallback } = await import('@/lib/auth-callback')
    const response = await onAuthCallback(
      null,
      { appBaseUrl: 'http://localhost:3000' },
      { user: { sub: 'auth0|abc123', email: 'owner@example.com' } } as never
    )

    expect(upsertFromAuth0Mock).toHaveBeenCalledWith({
      sub: 'auth0|abc123',
      email: 'owner@example.com',
    })
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard')
  })

  it('throws immediately when AUTH0_BASE_URL is missing during callback handling', async () => {
    const { onAuthCallback } = await import('@/lib/auth-callback')

    await expect(onAuthCallback(null, {}, { user: null } as never)).rejects.toThrow(
      'Missing required environment variable: AUTH0_BASE_URL'
    )
  })

  it('redirects unauthenticated app layout requests to /login', async () => {
    getSessionMock.mockResolvedValue(null)

    const { default: AppLayout } = await import('@/app/(app)/layout')

    await expect(
      AppLayout({ children: createElement('div', null, 'Protected') })
    ).rejects.toThrow('REDIRECT:/login')
  })

  it('redirects app layout requests when the session is missing a user subject', async () => {
    getSessionMock.mockResolvedValue({
      user: {
        email: 'owner@example.com',
      },
    })

    const { default: AppLayout } = await import('@/app/(app)/layout')

    await expect(
      AppLayout({ children: createElement('div', null, 'Protected') })
    ).rejects.toThrow('REDIRECT:/login')
  })

  it('delegates /api/auth/logout to the Auth0 middleware redirect', async () => {
    middlewareMock.mockResolvedValue(NextResponse.redirect('http://localhost:3000/'))

    const { GET } = await import('@/app/api/auth/[auth0]/route')
    const response = await GET(new Request('http://localhost:3000/api/auth/logout'))

    expect(middlewareMock).toHaveBeenCalledTimes(1)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('returns the authenticated user shape from requireAuth', async () => {
    getSessionMock.mockResolvedValue({
      user: {
        sub: 'auth0|abc123',
        email: 'owner@example.com',
      },
    })
    upsertFromAuth0Mock.mockResolvedValue({
      id: 'user-1',
      auth0Id: 'auth0|abc123',
      email: 'owner@example.com',
      workspaceMembers: [{ workspaceId: 'workspace-1', role: 'owner' }],
    })

    const { requireAuth } = await import('@/lib/auth')
    const user = await requireAuth()

    expect(user).toEqual({
      auth0Id: 'auth0|abc123',
      email: 'owner@example.com',
      id: 'user-1',
      role: 'owner',
      workspaceId: 'workspace-1',
    })
    expect(upsertFromAuth0Mock).toHaveBeenCalledWith({
      sub: 'auth0|abc123',
      email: 'owner@example.com',
    })
  })

  it('falls back to /dashboard when returnTo is an absolute URL (open redirect guard)', async () => {
    vi.stubEnv('AUTH0_BASE_URL', 'http://localhost:3000')

    const { onAuthCallback } = await import('@/lib/auth-callback')
    const response = await onAuthCallback(
      null,
      { appBaseUrl: 'http://localhost:3000', returnTo: 'https://evil.com/steal' },
      { user: { sub: 'auth0|abc123', email: 'owner@example.com' } } as never
    )

    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard')
  })

  it('falls back to /dashboard when returnTo is a protocol-relative URL (open redirect guard)', async () => {
    vi.stubEnv('AUTH0_BASE_URL', 'http://localhost:3000')

    const { onAuthCallback } = await import('@/lib/auth-callback')
    const response = await onAuthCallback(
      null,
      { appBaseUrl: 'http://localhost:3000', returnTo: '//evil.com/steal' },
      { user: { sub: 'auth0|abc123', email: 'owner@example.com' } } as never
    )

    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard')
  })

  it('throws a 401 ApiError when requireAuth is called without a session', async () => {
    getSessionMock.mockResolvedValue(null)

    const { requireAuth } = await import('@/lib/auth')

    await expect(requireAuth()).rejects.toMatchObject({
      message: 'UNAUTHORIZED',
      statusCode: 401,
    })
  })
})
