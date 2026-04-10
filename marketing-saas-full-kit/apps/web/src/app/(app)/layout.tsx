import React from 'react'
import { redirect } from 'next/navigation'

import { auth0 } from '@/lib/auth0'

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth0.getSession()

  if (!session?.user?.sub) {
    redirect('/login')
  }

  return children
}
