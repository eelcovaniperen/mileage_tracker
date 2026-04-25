# Project Instructions for Claude

## Auto-commit and Push

After completing any code changes, always:
1. Commit the changes with a descriptive message
2. Push to the remote repository

Do not ask for confirmation - commit and push automatically after each task is completed.

## Deployment

After pushing changes, deploy to Vercel with:
```bash
npx vercel --prod --yes
```

## Database

- Database: Neon PostgreSQL (migrated from Supabase)
- ORM: Prisma v5
- Connection strings are stored in Vercel environment variables

## Tech Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Vercel Serverless Functions
- Database: Neon PostgreSQL with Prisma
- Auth: JWT tokens

## ⚠️ Dual API implementations — keep in sync

There are TWO parallel API implementations and changes MUST be made to both:

1. **`api/handler.js`** — the Vercel serverless function. This is what runs
   in production (see `vercel.json` rewrites). Also `api/dashboard/stats.js`.
2. **`server/src/routes/*.js`** — an Express server used only for local
   development. Vite proxies `/api` → `http://localhost:3001` (this server).

Production does NOT use the `server/` directory. If you only edit one side,
local and prod will diverge silently. Always mirror route changes across both.
