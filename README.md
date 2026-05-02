# Flow

A lightweight issue tracker for teams who'd rather build than manage tickets.

**[Try it live →](https://flowpm.vercel.app)**

[![Watch the Flow demo](public/flow-demo-poster.jpg)](https://github.com/rayanxn/Flow/raw/main/public/flow-demo.mp4)

<sub>Click the poster to play the demo (60s, no audio).</sub>

## Run locally

```bash
git clone https://github.com/rayanxn/Flow.git
cd Flow
npm install
cp .env.local.example .env.local   # fill in your Supabase keys
npm run dev
```

Then open [localhost:3000](http://localhost:3000). To seed a realistic workspace (4 projects, 20 issues, 3 teams, notifications):

```bash
npx tsx scripts/seed-test-data.ts
```

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · GSAP + Lenis · Supabase (Postgres, RLS, Realtime) · TipTap · Radix · dnd-kit · cmdk · Recharts

---

Built as a Senior Project.
