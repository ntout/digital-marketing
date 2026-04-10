import type { SdkError } from '@auth0/nextjs-auth0/errors'
import type { OnCallbackContext, SessionData } from '@auth0/nextjs-auth0/types'
import { NextResponse } from 'next/server'

import { UserService } from '@/lib/services/UserService'

function getRedirectBaseUrl(appBaseUrl?: string) {
  return appBaseUrl ?? process.env.AUTH0_BASE_URL
}

function safeReturnPath(returnTo: string | undefined): string {
  if (!returnTo) return '/dashboard'
  // Only allow relative paths; reject absolute URLs and protocol-relative URLs.
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return '/dashboard'
  return returnTo
}

export async function onAuthCallback(
  error: SdkError | null,
  ctx: OnCallbackContext,
  session: SessionData | null
) {
  const baseUrl = getRedirectBaseUrl(ctx?.appBaseUrl)

  if (!baseUrl) {
    throw new Error('Missing required environment variable: AUTH0_BASE_URL')
  }

  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', baseUrl))
  }

  const auth0User = session?.user

  if (auth0User?.sub && auth0User.email) {
    await UserService.upsertFromAuth0({
      sub: auth0User.sub,
      email: auth0User.email,
    })
  }

  return NextResponse.redirect(new URL(safeReturnPath(ctx?.returnTo), baseUrl))
}
