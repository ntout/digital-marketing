import { BarChart3, Database, Lock, ServerCog } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const pillars = [
  {
    icon: ServerCog,
    title: 'Monorepo Ready',
    description: 'pnpm workspace root with shared tooling and local Docker services.',
  },
  {
    icon: Database,
    title: 'Data Layer Stubbed',
    description: 'Prisma clients and utility packages are ready for feature stories.',
  },
  {
    icon: Lock,
    title: 'Secrets Planned',
    description: 'Environment examples line up with the Auth0, DB, Redis, and platform keys.',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.04),transparent_45%),linear-gradient(180deg,#fafaf9_0%,#f5f5f4_100%)] px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="grid gap-6 rounded-3xl border bg-white/80 p-8 shadow-sm backdrop-blur md:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <Badge variant="secondary" className="w-fit">
              US-000 Bootstrap
            </Badge>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-balance">
                Marketing analytics monorepo scaffolded for the next story.
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                The web app, worker, shared database package, and utility stubs are all lined up so
                feature stories can focus on behavior instead of structure.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="lg">Inspect Bootstrap</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bootstrap Checklist</DialogTitle>
                    <DialogDescription>
                      The scaffold includes a Next.js web app, BullMQ worker, Prisma package, and
                      shared utility stubs.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="lg">
                    Monorepo Packages
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>@mktg/web</DropdownMenuItem>
                  <DropdownMenuItem>@mktg/worker</DropdownMenuItem>
                  <DropdownMenuItem>@mktg/db</DropdownMenuItem>
                  <DropdownMenuItem>@mktg/utils</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Card className="border-black/5 bg-stone-950 text-stone-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-stone-50">
                <Avatar className="h-9 w-9 border border-white/20">
                  <AvatarFallback className="bg-white/10 text-xs text-white">MK</AvatarFallback>
                </Avatar>
                Local Readiness
              </CardTitle>
              <CardDescription className="text-stone-300">
                The scaffold is intentionally minimal and feature-free.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-stone-300">Search created packages</p>
                <Input placeholder="web, worker, db, utils" className="border-white/10 bg-white/5" />
              </div>
              <Separator className="bg-white/10" />
              <div className="grid gap-3">
                <Skeleton className="h-4 w-full bg-white/10" />
                <Skeleton className="h-4 w-5/6 bg-white/10" />
                <Skeleton className="h-4 w-2/3 bg-white/10" />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="border-black/5 bg-white/85">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <Icon className="h-5 w-5" />
                  {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border bg-white/85 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Bootstrap Inventory</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>@mktg/web</TableCell>
                <TableCell>App Router UI shell, Tailwind, and shadcn/ui base components.</TableCell>
                <TableCell>
                  <Badge>Ready</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>@mktg/worker</TableCell>
                <TableCell>BullMQ worker entrypoint with Redis configuration helpers.</TableCell>
                <TableCell>
                  <Badge>Ready</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>@mktg/db</TableCell>
                <TableCell>Prisma schema plus read/write client exports.</TableCell>
                <TableCell>
                  <Badge>Ready</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>@mktg/utils</TableCell>
                <TableCell>Encryption, logging, secrets, and email wrappers.</TableCell>
                <TableCell>
                  <Badge>Ready</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>
      </div>
    </main>
  )
}
