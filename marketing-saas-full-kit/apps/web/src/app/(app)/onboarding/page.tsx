import React from 'react'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { requireAuth } from '@/lib/auth'

export default async function OnboardingPage() {
  const user = await requireAuth()

  if (user.workspaceId) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),transparent_35%),linear-gradient(180deg,#fafaf9_0%,#eff6ff_100%)] px-6 py-16">
      <Card className="w-full max-w-xl border-black/5 bg-white/90 shadow-lg">
        <CardHeader className="space-y-3">
          <CardTitle className="text-3xl tracking-tight">Create your workspace</CardTitle>
          <CardDescription>
            Give your team space a name so we can scope analytics, connections, and permissions
            correctly from the start.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/v1/workspaces" method="post" className="space-y-4">
            <Input
              autoComplete="organization"
              maxLength={255}
              name="name"
              placeholder="Acme Growth"
              required
            />
            <Button className="w-full" size="lg" type="submit">
              Create workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
