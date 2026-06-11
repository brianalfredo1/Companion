# Us 🤍

A private couples app for Brian & Natasya — daily habits, notes, shared to-dos,
watchlist, food ideas, date nights, countdowns, goals, adventures, and a
points/rank system you climb together.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase ·
Vercel**.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the entire contents of
   [`schema.sql`](./schema.sql), and run it. This creates all tables, row-level
   security policies, the `create_room` / `join_room` functions, and enables
   realtime.
3. (Recommended) In **Authentication → Providers → Email**, turn **off**
   "Confirm email" so signup flows straight into room setup. If you leave it
   on, the app will prompt you to confirm your email before continuing.
4. From **Project Settings → API**, copy the project URL and the `anon` key.

## 2. Run locally

```bash
cp .env.local.example .env.local   # then fill in your Supabase values
npm install
npm run dev
```

Environment variables:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon (public) key |

## 3. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the
   `us-app` GitHub repository. Vercel auto-detects Next.js — no `vercel.json`
   needed.
2. In the import screen, add the two environment variables above
   (Production + Preview).
3. Click **Deploy**.

Or with the CLI:

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

## 4. First run

1. Brian signs up at `/signup`, chooses **Create a new room**, and gets a
   6-character invite code.
2. Natasya signs up and enters the invite code to join the same room.
3. Everything — habits, notes, todos, points — is shared and updates live.

## Points & ranks

| Action | Points |
| --- | --- |
| Exercise done | 15 |
| Good night's sleep | 10 |
| 8 glasses of water | 10 |
| To-do completed | 5 |
| Note sent | 5 |
| Watched together | 20 |
| Ate together | 25 |
| Date night completed | 40 |
| Adventure completed | 50 |
| Goal milestone (25/50/75/100%) | 30 each |

Ranks: 🤍 Strangers (0) → 🥉 Bronze (100) → 🥈 Silver (300) → 🥇 Gold (700) →
💎 Diamond (1500) → 👑 Soulmates (3000).
