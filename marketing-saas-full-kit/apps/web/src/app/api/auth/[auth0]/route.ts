import { auth0 } from '@/lib/auth0'

export async function GET(request: Request) {
  return auth0.middleware(request)
}
