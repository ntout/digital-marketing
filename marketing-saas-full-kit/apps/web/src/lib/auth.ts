import { ApiError } from '@/lib/errors'
import { auth0 } from '@/lib/auth0'
import { UserService } from '@/lib/services/UserService'

export const roles = ['owner', 'admin', 'manager', 'marketer', 'viewer'] as const

export type Role = (typeof roles)[number]

export type AppUser = {
  id: string
  auth0Id: string
  email: string
  workspaceId: string | null
  role: Role | null
}

export async function requireAuth(_req?: Request): Promise<AppUser> {
  const session = await auth0.getSession()
  const auth0User = session?.user

  if (!auth0User?.sub || !auth0User.email) {
    throw new ApiError(401, 'UNAUTHORIZED')
  }

  const localUser = await UserService.upsertFromAuth0({
    sub: auth0User.sub,
    email: auth0User.email,
  })

  const membership = localUser.workspaceMembers[0]

  return {
    id: localUser.id,
    auth0Id: localUser.auth0Id,
    email: localUser.email,
    role: membership?.role ?? null,
    workspaceId: membership?.workspaceId ?? null,
  }
}

export function requireRole(user: AppUser, allowedRoles: Role[]): void {
  if (!user.role || !allowedRoles.includes(user.role)) {
    throw new ApiError(403, 'FORBIDDEN')
  }
}
