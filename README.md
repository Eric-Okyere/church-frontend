# GraceTrack — church-frontend

The frontend for GraceTrack: member management, live attendance dashboard,
QR check-in kiosk, and the public self-check-in page. Talks to the
`church-backend` API over HTTP — it has no database connection or secrets of
its own, which is what lets it deploy as a plain static/client-rendered site
on Netlify.

## How it's different from a typical Next.js app

Every page here is a Client Component that fetches its data from the
backend API with `fetch` (see `src/lib/api.ts`), rather than a Server
Component querying a database directly. Sign-in works the same way: logging
in gets a token from the API, which is kept in `localStorage` and sent as an
`Authorization: Bearer <token>` header on every request after that (see
`src/lib/auth-context.tsx`). There's no server-side session or cookie to
manage, which is what makes it safe to run frontend and backend as two
completely separate deployments (different domains, different hosts).

## Getting started locally

You'll need `church-backend` running first (see its own README) — by
default at `http://localhost:4000`.

```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:4000 by default
npm run dev
```

Open http://localhost:3000 and sign in with the admin login you created
when you seeded the backend.

## Deploying to Netlify

1. Push this `church-frontend` folder to its own GitHub repo (or a
   subdirectory of a repo — Netlify lets you set a base directory).
2. On [netlify.com](https://netlify.com): Add new site → Import an existing
   project → connect the repo. It should detect Next.js automatically
   (this repo includes a `netlify.toml` that points it at the official
   Next.js runtime, so no manual build configuration should be needed).
3. Environment variables (Site settings → Environment variables):
   - `NEXT_PUBLIC_API_URL` — your Render backend's URL, e.g.
     `https://your-church-backend.onrender.com` (no trailing slash).
4. Deploy.

**Important — do this on the backend side too:** once you know your
Netlify URL, go back to `church-backend`'s environment variables on Render
and set `FRONTEND_URL` to it (e.g. `https://your-church.netlify.app`). The
backend only accepts requests from origins listed there — until it matches,
every request from your deployed frontend will fail with a CORS error in
the browser console. If you're not sure of your final Netlify URL yet,
deploy once, copy the URL Netlify gives you, then update `FRONTEND_URL` on
Render and it'll pick up the change on its next restart.

## Project structure

```
src/
  lib/
    api.ts             fetch wrapper — adds the auth header, throws ApiError on failure
    auth-context.tsx   React context: current user, login(), logout(), token persistence
    utils.ts           date/time formatting helpers
  components/
    RequireAuth.tsx    redirects to /login if there's no signed-in user
    LiveAttendance.tsx polls the backend for live check-in counts
    ManualCheckIn.tsx  name/phone search + visitor add-on
  app/
    login/             sign-in page
    admin/              protected admin area (dashboard, members, services)
    scan/               usher check-in kiosk (camera scanner + manual search)
    c/[token]/          public self-check-in page a member's QR code opens
```
