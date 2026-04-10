import { dbWrite } from '@mktg/db'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth'
import { ApiError } from '@/lib/errors'

const WORKSPACE_NAME_MAX_LENGTH = 255
const WORKSPACE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .&'(),-]*$/

const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred while creating the workspace.',
  INVALID_JSON: 'Request body must be valid JSON.',
  UNAUTHORIZED: 'Authentication is required.',
  WORKSPACE_ALREADY_EXISTS: 'User already belongs to a workspace.',
  WORKSPACE_NAME_INVALID: 'Workspace name contains unsupported characters.',
  WORKSPACE_NAME_REQUIRED: 'Workspace name is required.',
  WORKSPACE_NAME_TOO_LONG: 'Workspace name must be 255 characters or fewer.',
} as const

type WorkspaceErrorCode = keyof typeof ERROR_MESSAGES

function errorResponse(code: WorkspaceErrorCode, status: number) {
  return NextResponse.json(
    {
      error: {
        code,
        message: ERROR_MESSAGES[code],
      },
    },
    { status }
  )
}

async function readWorkspaceName(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const body = (await request.json()) as { name?: unknown }

    return typeof body.name === 'string' ? body.name : ''
  }

  const formData = await request.formData()
  const value = formData.get('name')

  return typeof value === 'string' ? value : ''
}

function isWorkspaceErrorCode(code: string): code is WorkspaceErrorCode {
  return code in ERROR_MESSAGES
}

function validateWorkspaceName(name: string): WorkspaceErrorCode | null {
  if (!name) {
    return 'WORKSPACE_NAME_REQUIRED'
  }

  if (name.length > WORKSPACE_NAME_MAX_LENGTH) {
    return 'WORKSPACE_NAME_TOO_LONG'
  }

  if (!WORKSPACE_NAME_PATTERN.test(name)) {
    return 'WORKSPACE_NAME_INVALID'
  }

  return null
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request)
    const name = (await readWorkspaceName(request)).trim()
    const validationError = validateWorkspaceName(name)

    if (validationError) {
      return errorResponse(validationError, 400)
    }

    if (user.workspaceId) {
      return errorResponse('WORKSPACE_ALREADY_EXISTS', 409)
    }

    await dbWrite.workspace.create({
      data: {
        members: {
          create: {
            role: 'owner',
            user: {
              connect: {
                id: user.id,
              },
            },
          },
        },
        name,
        owner: {
          connect: {
            id: user.id,
          },
        },
      },
    })

    return NextResponse.redirect(new URL('/dashboard', request.url), 303)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse('INVALID_JSON', 400)
    }

    if (error instanceof ApiError) {
      const code = isWorkspaceErrorCode(error.message) ? error.message : 'INTERNAL_SERVER_ERROR'

      return errorResponse(code, error.statusCode)
    }

    console.error('Failed to create workspace', error)

    return errorResponse('INTERNAL_SERVER_ERROR', 500)
  }
}
