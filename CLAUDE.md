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
