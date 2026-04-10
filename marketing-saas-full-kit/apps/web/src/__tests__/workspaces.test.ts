import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const redirectMock = vi.fn((location: string) => {
  throw new Error(`REDIRECT:${location}`)
})

const requireAuthMock = vi.fn()
const workspaceCreateMock = vi.fn()
const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/lib/auth', () => ({
  requireAuth: requireAuthMock,
}))

vi.mock('@mktg/db', () => ({
  dbWrite: {
    workspace: {
      create: workspaceCreateMock,
    },
  },
}))

describe('workspace setup flow', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('redirects a signed-in user without a workspace from /dashboard to /onboarding', async () => {
    requireAuthMock.mockResolvedValue({
      auth0Id: 'auth0|abc123',
      email: 'owner@example.com',
      id: 'user-1',
      role: null,
      workspaceId: null,
    })

    const { default: DashboardPage } = await import('@/app/(app)/dashboard/page')

    await expect(DashboardPage()).rejects.toThrow('REDIRECT:/onboarding')
  })

  it('creates a workspace with the signed-in user as owner and redirects to /dashboard', async () => {
    requireAuthMock.mockResolvedValue({
      auth0Id: 'auth0|abc123',
      email: 'owner@example.com',
      id: 'user-1',
      role: null,
      workspaceId: null,
    })
    workspaceCreateMock.mockResolvedValue({
      id: 'workspace-1',
      name: 'Acme',
    })

    const { POST } = await import('@/app/api/v1/workspaces/route')
    const response = await POST(
      new Request('http://localhost:3000/api/v1/workspaces', {
        method: 'POST',
        body: new URLSearchParams({ name: 'Acme' }),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      })
    )

    expect(workspaceCreateMock).toHaveBeenCalledWith({
      data: {
        members: {
          create: {
            role: 'owner',
            user: {
              connect: {
                id: 'user-1',
              },
            },
          },
        },
        name: 'Acme',
        owner: {
          connect: {
            id: 'user-1',
          },
        },
      },
    })
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard')
  })

  it('rejects workspace names longer than 255 characters', async () => {
    requireAuthMock.mockResolvedValue({
      auth0Id: 'auth0|abc123',
      email: 'owner@example.com',
      id: 'user-1',
      role: null,
      workspaceId: null,
    })

    const { POST } = await import('@/app/api/v1/workspaces/route')
    const response = await POST(
      new Request('http://localhost:3000/api/v1/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: 'A'.repeat(256) }),
        headers: {
          'content-type': 'application/json',
        },
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'WORKSPACE_NAME_TOO_LONG',
        message: 'Workspace name must be 255 characters or fewer.',
      },
    })
    expect(workspaceCreateMock).not.toHaveBeenCalled()
  })

  it('rejects workspace names with disallowed characters', async () => {
    requireAuthMock.mockResolvedValue({
      auth0Id: 'auth0|abc123',
      email: 'owner@example.com',
      id: 'user-1',
      role: null,
      workspaceId: null,
    })

    const { POST } = await import('@/app/api/v1/workspaces/route')
    const response = await POST(
      new Request('http://localhost:3000/api/v1/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: 'Acme <script>' }),
        headers: {
          'content-type': 'application/json',
        },
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'WORKSPACE_NAME_INVALID',
        message: 'Workspace name contains unsupported characters.',
      },
    })
    expect(workspaceCreateMock).not.toHaveBeenCalled()
  })

  it('returns 409 json when the user already has a workspace', async () => {
    requireAuthMock.mockResolvedValue({
      auth0Id: 'auth0|abc123',
      email: 'owner@example.com',
      id: 'user-1',
      role: 'owner',
      workspaceId: 'workspace-1',
    })

    const { POST } = await import('@/app/api/v1/workspaces/route')
    const response = await POST(
      new Request('http://localhost:3000/api/v1/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: 'Acme' }),
        headers: {
          'content-type': 'application/json',
        },
      })
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'WORKSPACE_ALREADY_EXISTS',
        message: 'User already belongs to a workspace.',
      },
    })
    expect(workspaceCreateMock).not.toHaveBeenCalled()
  })

  it('returns 400 json for malformed json bodies', async () => {
    requireAuthMock.mockResolvedValue({
      auth0Id: 'auth0|abc123',
      email: 'owner@example.com',
      id: 'user-1',
      role: null,
      workspaceId: null,
    })

    const { POST } = await import('@/app/api/v1/workspaces/route')
    const response = await POST(
      new Request('http://localhost:3000/api/v1/workspaces', {
        method: 'POST',
        body: '{"name":',
        headers: {
          'content-type': 'application/json',
        },
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must be valid JSON.',
      },
    })
    expect(consoleErrorMock).not.toHaveBeenCalled()
  })

  it('logs unknown failures and returns 500 json', async () => {
    requireAuthMock.mockResolvedValue({
      auth0Id: 'auth0|abc123',
      email: 'owner@example.com',
      id: 'user-1',
      role: null,
      workspaceId: null,
    })
    workspaceCreateMock.mockRejectedValue(new Error('db offline'))

    const { POST } = await import('@/app/api/v1/workspaces/route')
    const response = await POST(
      new Request('http://localhost:3000/api/v1/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: 'Acme' }),
        headers: {
          'content-type': 'application/json',
        },
      })
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while creating the workspace.',
      },
    })
    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Failed to create workspace',
      expect.objectContaining({ message: 'db offline' })
    )
  })
})
