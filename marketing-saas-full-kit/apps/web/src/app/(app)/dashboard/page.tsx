import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAuth } from '@/lib/auth'

export default async function DashboardPage() {
  const user = await requireAuth()

  if (!user.workspaceId) {
    redirect('/onboarding')
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fafaf9_0%,#f1f5f9_100%)] px-6 py-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Card className="border-black/5 bg-white/90 shadow-sm">
          <CardHeader className="space-y-3">
            <CardTitle className="text-3xl tracking-tight">Dashboard</CardTitle>
            <CardDescription>
              Auth is active and your workspace-scoped application shell is ready for the next
              stories.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Signed in as {user.email} with the {user.role} role.
            </span>
            <Button asChild variant="outline">
              <Link href="/api/auth/logout">Sign out</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
