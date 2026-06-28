# Vercel Deployment Guide — Smart Library

## Prerequisites
- Supabase project created and schema initialized (run supabase_schema.sql)
- Clerk application created with Supabase JWT template configured (named: supabase)
- Vercel account connected to your GitHub repository

## Environment Variables to set in Vercel Dashboard
Go to: Vercel Project → Settings → Environment Variables
Add these three variables for Production, Preview, and Development environments:

| Variable Name                  | Where to get it                          |
|-------------------------------|------------------------------------------|
| VITE_CLERK_PUBLISHABLE_KEY    | Clerk Dashboard → API Keys               |
| VITE_SUPABASE_URL             | Supabase Dashboard → Project Settings → API |
| VITE_SUPABASE_ANON_KEY        | Supabase Dashboard → Project Settings → API |

## Deploy steps
1. Push your code to GitHub (main or dev branch)
2. Import the repository in Vercel Dashboard → Add New Project
3. When Vercel asks for configuration, leave everything blank — 
   vercel.json at the root handles all settings automatically
4. Add the three environment variables listed above
5. Click Deploy

## After deployment
- Your app URL will be: https://your-project-name.vercel.app
- All routes (e.g. /student/catalog, /admin/dashboard) will work directly
- The app will automatically run in Live Cloud Mode (Supabase + Clerk)
- The local Express server and SQLite are never used in production

## Redeployment
Every push to the connected branch triggers an automatic redeployment.
No manual steps needed after the first deploy.

## What is NOT on Vercel
- server/ (Express backend) — local development only
- database/ (SQLite) — local development only
- SQL files — run manually in Supabase SQL Editor

## Troubleshooting

| Problem                        | Fix                                                    |
|-------------------------------|--------------------------------------------------------|
| Blank page on load             | Check VITE_ env vars are set in Vercel Dashboard       |
| 404 on page refresh            | Confirm vercel.json rewrites rule is present           |
| Auth not working               | Check Clerk publishable key and JWT template name      |
| Database errors                | Confirm supabase_schema.sql was run in SQL Editor      |
| Build fails                    | Check Vercel build logs — likely a missing dependency  |
