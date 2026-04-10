import { Auth0Client } from '@auth0/nextjs-auth0/server'

import { onAuthCallback } from '@/lib/auth-callback'

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function getAuth0Domain() {
  const issuerBaseUrl = getRequiredEnv('AUTH0_ISSUER_BASE_URL')

  return issuerBaseUrl.replace(/^https?:\/\//, '')
}

export const auth0 = new Auth0Client({
  appBaseUrl: getRequiredEnv('AUTH0_BASE_URL'),
  authorizationParameters: {
    scope: 'openid profile email',
  },
  clientId: getRequiredEnv('AUTH0_CLIENT_ID'),
  clientSecret: getRequiredEnv('AUTH0_CLIENT_SECRET'),
  domain: getAuth0Domain(),
  onCallback: onAuthCallback,
  routes: {
    callback: '/api/auth/callback',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
  },
  secret: getRequiredEnv('AUTH0_SECRET'),
  signInReturnToPath: '/dashboard',
})
