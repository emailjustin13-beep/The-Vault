# The Vault

A personal streaming platform powered by Put.io and TMDb.

## Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js Route Handlers
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Auth**: Auth.js (NextAuth v5)
- **Media Source**: Put.io API
- **Metadata**: TMDb API
- **Deploy**: Vercel

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `AUTH_SECRET` — Run `openssl rand -base64 32`
- `PUTIO_ACCESS_TOKEN` — From app.put.io/oauth
- `TMDB_API_KEY` — From themoviedb.org/settings/api

### 3. Push database schema

```bash
npm run db:push
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with any email — your account is created automatically (single-user system).

### 5. Connect your services

Go to **Settings**, add your Put.io access token and TMDb API key, test both connections, then click **Scan Library**.

## Deployment

### Vercel

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables
4. Deploy

The database schema will need to be pushed manually before first deployment:
```bash
DATABASE_URL=your_neon_url npm run db:push
```

## Project Structure

```
app/
  (auth)/login/      — Login page
  (app)/
    home/            — Home dashboard
    movies/          — Movie library
    tv/              — TV show library
    anime/           — Anime library
    collections/     — Collections
    search/          — Search
    settings/        — Settings
    media/[id]/      — Media detail
    watch/[id]/      — Video player
  api/
    auth/            — Auth.js handlers
    scan/            — Library scanner
    progress/        — Watch progress
    search/          — Search endpoint
    settings/        — Settings CRUD
    putio/           — Put.io proxy + test
    tmdb/            — TMDb test

components/
  layout/            — Sidebar, MobileNav
  media/             — MediaCard, MediaRail, Skeletons
  player/            — VideoPlayer

services/
  putio.ts           — Put.io API client
  tmdb.ts            — TMDb API client
  parser.ts          — Filename parser
  scanner.ts         — Library scan orchestrator

db/
  schema/            — Drizzle schema
  index.ts           — DB connection
```

## Features

- 🎬 Stream directly from Put.io (no downloads)
- 🔍 Automatic metadata matching via TMDb
- 📊 Watch progress tracking with resume playback
- 🗂️ Collections (automatic + manual)
- 📱 Mobile-first responsive design
- 🌙 Dark theme
- ⚡ Server Components for fast loading
