# Frontend Architecture Standards

> Read this before implementing any React component, Next.js page, or frontend utility.

---

## Stack

| Tool | Purpose |
|------|---------|
| Next.js 14+ (App Router) | Framework |
| TypeScript | Language — strict mode enabled |
| Tailwind CSS | Styling — utility-first |
| shadcn/ui | UI component library — built on Radix UI primitives |
| TanStack Query (React Query) | Server state, data fetching, caching |
| Zod | Runtime validation of API responses |
| Recharts | Charts (trend lines, bar charts, attribution) |
| React Hook Form | Form state management |

---

## App Router conventions

### Server vs client components
Default to **Server Components**. Only add `'use client'` when required.

Use Server Components for:
- Page-level data fetching
- Static or server-rendered content
- Layout wrappers

Use Client Components (`'use client'`) for:
- Interactive UI (forms, buttons with state, dropdowns)
- Charts and visualizations
- Real-time updates
- TanStack Query hooks

```ts
// Server component — no 'use client'
// apps/web/src/app/dashboard/page.tsx
import { DashboardKpis } from '@/components/dashboard/DashboardKpis'

export default async function DashboardPage() {
  // Data fetching happens server-side
  const data = await fetch(`${process.env.AUTH0_BASE_URL}/api/v1/dashboard`, {
    headers: { Cookie: cookies().toString() },
    next: { revalidate: 60 }   // ISR: revalidate every 60 seconds
  })
  const dashboard = await data.json()
  return <DashboardKpis initialData={dashboard.data} />
}
```

### File-based routing structure
```
apps/web/src/app/
  layout.tsx                    ← root layout (fonts, providers)
  page.tsx                      ← redirect to /dashboard
  (auth)/
    login/page.tsx
  (app)/
    layout.tsx                  ← authenticated layout (nav, sidebar)
    dashboard/page.tsx
    analytics/
      trends/page.tsx
      campaigns/page.tsx
      attribution/page.tsx
    campaigns/
      [id]/page.tsx
      [id]/edit/page.tsx
    ai/
      insights/page.tsx
      approval-queue/page.tsx
    reports/page.tsx
    settings/
      team/page.tsx
      connections/page.tsx
      ai-agent/page.tsx
    activity-log/page.tsx
```

---

## API client

All API calls go through `apps/web/src/lib/api.ts`. Never use `fetch` directly in components.

```ts
// Usage in a client component with TanStack Query
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

function CampaignList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['campaigns', { platform: 'meta', dateFrom, dateTo }],
    queryFn: () => api.get('/analytics/campaigns', { platform: 'meta', dateFrom, dateTo })
  })
}
```

The `api` client:
- Uses same-origin requests so the browser automatically includes the Auth0 session cookie
- Normalizes non-2xx responses into a typed `ApiError`
- Redirects to `/login` when the backend returns `401 UNAUTHORIZED`
- Returns typed responses using Zod schemas

---

## TanStack Query conventions

### Query key structure
Always use arrays. First element is the resource type, subsequent elements are filters/params.

```ts
['dashboard', { dateRange }]
['campaigns', { platform, dateFrom, dateTo }]
['campaign', campaignId]
['ai-insights', { type, status }]
['approval-queue']
['activity-log', { actorType, platform, dateRange }]
```

### Invalidation after mutations
After any mutation that changes server state, invalidate the relevant queries:

```ts
const mutation = useMutation({
  mutationFn: (data) => api.post(`/campaigns/${id}/changes/confirm`, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['campaign', id] })
    queryClient.invalidateQueries({ queryKey: ['activity-log'] })
    queryClient.invalidateQueries({ queryKey: ['campaigns'] })
  }
})
```

### Stale time defaults
Set globally in the QueryClient provider:
```ts
defaultOptions: {
  queries: {
    staleTime: 60 * 1000,      // 1 minute — most data
    gcTime: 5 * 60 * 1000,     // 5 minutes garbage collection
  }
}
```

Override per-query for time-sensitive data (approval queue, notifications):
```ts
useQuery({ queryKey: ['approval-queue'], staleTime: 10 * 1000 })  // 10 seconds
```

---

## Component architecture

### Component categories

**`components/ui/`** — shadcn/ui components (auto-generated via CLI, owned by the project). Do not edit these manually — re-run the shadcn CLI to add or update components. Examples: `Button`, `Input`, `Badge`, `Dialog`, `DropdownMenu`, `Table`, `Skeleton`, `Sonner` (toast)

**`components/charts/`** — Recharts wrappers. Accept data as props, handle empty states.
Examples: `TrendLineChart`, `KpiCard`, `PlatformBreakdownBar`, `AttributionChart`

**`components/campaigns/`** — Campaign-specific components.
Examples: `CampaignTable`, `CampaignEditPanel`, `AdCopyEditor`, `AdPreview`, `BulkActionToolbar`

**`components/ai/`** — AI agent UI.
Examples: `InsightsPanel`, `InsightCard`, `ApprovalQueueTable`, `AiSettingsForm`, `KillSwitchButton`, `ActivityLog`

**`components/dashboard/`** — Dashboard widgets.
Examples: `DashboardKpis`, `RecentAlerts`, `InsightsWidget`, `SyncStatusBar`

### Component rules
- Every component that can be in a loading state must handle it (show skeleton, not empty)
- Every component that can have no data must handle it (show empty state with a helpful message)
- Every component that can error must handle it (show error state, not crash)
- Props are typed with TypeScript interfaces — never use `any`
- No inline styles — Tailwind classes only

### Empty and loading states
```tsx
// Pattern for all data-fetching components
if (isLoading) return <CampaignTableSkeleton />
if (error) return <ErrorState message="Failed to load campaigns" onRetry={refetch} />
if (!data || data.length === 0) return <EmptyState message="No campaigns found" action={<ConnectPlatformButton />} />
return <CampaignTableContent data={data} />
```

---

## Forms

Use React Hook Form + Zod for all forms.

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  dailyBudget: z.number().positive('Budget must be positive'),
})

function EditBudgetForm({ campaign, onSuccess }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { dailyBudget: campaign.dailyBudget }
  })

  const mutation = useMutation({ mutationFn: submitBudgetChange, onSuccess })

  return (
    <form onSubmit={handleSubmit(mutation.mutate)}>
      <Input {...register('dailyBudget', { valueAsNumber: true })} />
      {errors.dailyBudget && <p>{errors.dailyBudget.message}</p>}
      <Button type="submit" loading={isSubmitting}>Save</Button>
    </form>
  )
}
```

---

## Auth flow

Authentication is managed by **Auth0** via the `@auth0/nextjs-auth0` SDK. Do not implement custom token storage, login forms, or session management.

### Session access

**Server Components and Route Handlers:**
```ts
import { cookies } from 'next/headers'
import { getSession } from '@auth0/nextjs-auth0'

const session = await getSession()  // returns null if not authenticated
```

**Client Components:**
```ts
import { useUser } from '@auth0/nextjs-auth0/client'

const { user, isLoading } = useUser()  // user is null if not authenticated
```

### Protected routes
The `(app)` route group layout checks for a valid Auth0 session server-side. If no session: redirect to `/login`.

```ts
// apps/web/src/app/(app)/layout.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@auth0/nextjs-auth0'

export default async function AppLayout({ children }) {
  const session = await getSession()
  if (!session) redirect('/login')
  return <>{children}</>
}
```

### Login / logout links
```tsx
// Login — redirects to Auth0 Universal Login
<a href="/api/auth/login">Sign in</a>

// Logout — terminates Auth0 session and redirects home
<a href="/api/auth/logout">Sign out</a>
```

### usePermission hook
The `useUser()` hook from Auth0 returns the Auth0 profile. For our app-level role and workspaceId, use the custom `useAppUser()` hook which fetches the enriched user from our API:

```ts
import { useAppUser } from '@/hooks/useAppUser'

const { user } = useAppUser()  // { auth0Id, email, workspaceId, role }
```

---

## Role-based UI

UI elements are conditionally shown based on role. This is **display only** — security is enforced on the API.

```tsx
import { useAppUser } from '@/hooks/useAppUser'

function CampaignActions({ campaign }) {
  const { user } = useAppUser()
  const role = user?.role
  const canEdit = ['owner', 'admin', 'manager'].includes(role)

  return (
    <div>
      <Button onClick={viewCampaign}>View</Button>
      {canEdit && <Button onClick={editCampaign}>Edit</Button>}
    </div>
  )
}
```

Create a `usePermission` hook that encapsulates role checks:
```ts
const { can } = usePermission()
can('edit_campaigns')   // returns boolean
can('manage_ai')        // returns boolean
```

---

## Tailwind conventions

- Use the design system colors defined in `tailwind.config.ts` — do not use arbitrary color values
- Responsive: mobile-first (`sm:`, `md:`, `lg:` prefixes)
- Dark mode: supported via `dark:` prefix — use semantic colors, not hardcoded ones
- Do not use `@apply` in component files — compose with JSX class names

---

## Environment variables

Frontend env vars must be prefixed with `NEXT_PUBLIC_` to be exposed to the browser. Keep this minimal — never expose secrets.

```
NEXT_PUBLIC_APP_ENV=production
```

Server-only (no prefix):
```
# Auth0 — required by @auth0/nextjs-auth0
AUTH0_SECRET=          ← 32-byte random string for cookie encryption
AUTH0_BASE_URL=        ← app base URL (e.g. https://app.yourdomain.com)
AUTH0_ISSUER_BASE_URL= ← Auth0 domain (e.g. https://yourapp.auth0.com)
AUTH0_CLIENT_ID=       ← Auth0 app client ID
AUTH0_CLIENT_SECRET=   ← Auth0 app client secret
```
