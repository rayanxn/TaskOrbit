# Flowboard

Project management for engineering and product teams. Think Linear crossed with Trello: a fast, keyboard-driven app with Kanban boards, sprint planning, saved views, and live collaboration.

Next.js 16, Supabase, Tailwind CSS. Deployed to Vercel.

## What it does

Issues have sequential keys (FLO-1, FLO-2, ...), four statuses (Todo, In Progress, In Review, Done), priorities P0 through P3, story points, due dates, and per-project labels. You create them in a modal, track them on a Kanban board or list view, and drag them between columns to change status. Board changes sync across all connected clients in real time via Supabase Realtime, with optimistic UI that rolls back on failure.

Sprints work the way you'd expect. Create one, drag issues from the backlog into it, start it (only one active per project), and complete it when the time's up. Unfinished issues roll back to the backlog automatically.

There's also a timeline/Gantt view, saved filter views ("High Priority Bugs", "My Sprint Tasks"), a dashboard with burndown and velocity charts, an inbox for notifications, and a command palette (Cmd+K) for keyboard-first navigation.

Workspaces are multi-tenant with three roles: Owner, Admin, Member. Projects can be private. Teams are grouped. New members join via invite links.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Database | Supabase (Postgres, Auth, Realtime, RLS) |
| Styling | Tailwind CSS 4 |
| UI Primitives | Radix UI |
| Drag & Drop | dnd-kit |
| Charts | Recharts |
| Command Palette | cmdk |
| Animations | GSAP, Lenis |
| Language | TypeScript (strict) |
| Testing | Playwright |
| Deployment | Vercel |

## Getting started

You need Node.js 20+ and a [Supabase](https://supabase.com) project (or run one locally with `supabase start`).

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Push the database schema (18 migrations covering tables, RLS policies, functions, triggers, and indexes):

```bash
supabase db push
```

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, create a workspace, and the app is ready.

## Project structure

```
src/
├── app/
│   ├── (auth)/                 # Login, signup, password reset, OAuth callback
│   ├── (app)/
│   │   ├── onboarding/         # Workspace creation wizard
│   │   └── [workspaceSlug]/
│   │       ├── dashboard/
│   │       ├── inbox/          # Notifications
│   │       ├── my-issues/
│   │       ├── projects/
│   │       │   └── [projectId]/
│   │       │       ├── board/          # Kanban
│   │       │       ├── list/           # Table view
│   │       │       ├── timeline/       # Gantt-style
│   │       │       ├── sprint-planning/
│   │       │       └── settings/
│   │       ├── views/          # Saved filters
│   │       ├── teams/
│   │       ├── analytics/
│   │       └── settings/       # Workspace settings
│   └── middleware.ts           # Auth guard, session refresh
│
├── components/
│   ├── ui/                     # Button, Dialog, Input, Select, Avatar, etc.
│   ├── board/                  # Kanban board, columns, cards, quick-add
│   ├── issues/                 # Issue list, rows, create modal
│   ├── sprints/                # Sprint planning, header, modals
│   ├── projects/               # Project cards, create modal
│   ├── landing/                # Marketing page (deferred)
│   └── ...                     # Dashboard, analytics, timeline, notifications
│
├── lib/
│   ├── actions/                # Server Actions (auth, issues, sprints, projects, ...)
│   ├── queries/                # Read-only data fetching
│   ├── hooks/                  # useRealtimeIssues, useWorkspace
│   ├── supabase/               # Client and server Supabase instances
│   ├── types/                  # Database types, app types
│   └── utils/                  # Statuses, priorities, dates, cn()
│
├── providers/                  # WorkspaceProvider (React Context)
└── middleware.ts

supabase/
└── migrations/                 # 18 SQL migrations (tables, RLS, functions, indexes)
```

## Database

15 tables, all with Row-Level Security so workspaces are fully isolated from each other.

The main ones: `profiles` (synced from Supabase Auth), `workspaces`, `workspace_members`, `projects`, `issues`, `sprints`, `labels`, `views`, `activities` (audit log), and `notifications`. There are also join tables for workspace invites, team membership, and issue labels.

A few Postgres functions do the heavy lifting:

- `create_issue()` atomically increments a workspace counter to generate sequential issue keys (FLO-1, FLO-2, ...) without collisions under concurrency.
- `create_workspace()` creates the workspace and its owner membership row in one transaction.
- `is_workspace_member()` and `get_user_workspace_role()` are the helpers that every RLS policy calls. There's a composite index on `workspace_members(user_id, workspace_id)` that makes this fast.

## Design

The palette is warm beige and cream, not the usual cold gray SaaS look. Background is `#F5F0EB`, surfaces are white, accent is a burnt orange `#C2410C`. Three typefaces: Space Grotesk for UI text, Instrument Serif for headings, JetBrains Mono for code and issue keys. Each workflow status gets its own color (gray, amber, purple, green).

## Scripts

```bash
npm run dev       # Dev server
npm run build     # Production build
npm start         # Production server
npm run lint      # ESLint
```

## License

Private.
