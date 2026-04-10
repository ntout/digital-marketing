import { redirect } from 'next/navigation'

import { auth0 } from '@/lib/auth0'

export default async function RootPage() {
  const session = await auth0.getSession()

  if (session?.user?.sub) {
    redirect('/dashboard')
  }

  redirect('/login')
}
