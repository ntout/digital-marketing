import React from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),transparent_35%),linear-gradient(180deg,#fafaf9_0%,#f5f5f4_100%)] px-6 py-16">
      <Card className="w-full max-w-md border-black/5 bg-white/90 shadow-lg">
        <CardHeader className="space-y-3">
          <CardTitle className="text-3xl tracking-tight">Sign in to your workspace</CardTitle>
          <CardDescription>
            Authentication is handled securely by Auth0 Universal Login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full" size="lg">
            <Link href="/api/auth/login">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
