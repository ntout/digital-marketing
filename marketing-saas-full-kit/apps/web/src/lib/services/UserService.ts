import { dbRead, dbWrite } from '@mktg/db'

type Auth0Profile = {
  sub: string
  email: string
}

export class UserService {
  static async upsertFromAuth0(auth0User: Auth0Profile) {
    return dbWrite.user.upsert({
      where: {
        auth0Id: auth0User.sub,
      },
      update: {
        email: auth0User.email,
      },
      create: {
        auth0Id: auth0User.sub,
        email: auth0User.email,
      },
      include: {
        workspaceMembers: {
          orderBy: {
            workspaceId: 'asc',
          },
          select: {
            role: true,
            workspaceId: true,
          },
          take: 1,
        },
      },
    })
  }

  static async findByAuth0Id(auth0Id: string) {
    return dbRead.user.findUnique({
      where: {
        auth0Id,
      },
      include: {
        workspaceMembers: {
          orderBy: {
            workspaceId: 'asc',
          },
          select: {
            role: true,
            workspaceId: true,
          },
          take: 1,
        },
      },
    })
  }
}
