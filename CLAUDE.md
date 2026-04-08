# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

There is no test runner configured. ESLint uses flat config (v9+) — run `npm run lint` to check for issues.

## Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
DEEPL_API_KEY
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
```

## Architecture

**Xplora MX** is a Next.js 16 App Router app for discovering local businesses in Mexico. The main user flow: user opens the map → grants geolocation → types a natural language query → Claude AI interprets it into filters → filtered businesses appear on map and in a results list.

### Key Data Flow

1. User query → `services/ia.ts` → `POST /api/interpretQuery` → returns `{ category, tags[] }`
2. Businesses fetched from Supabase (`negocios` table) via `hooks/useTranslatedNegocios.ts`
3. Results filtered by category/tags/5km radius (`services/geo.ts` Haversine formula)
4. Names/descriptions auto-translated via `services/translate.ts` → `POST /api/translate` (DeepL → Spanish)
5. UI strings translated via `context/LangContext.tsx` → `POST /api/translateUI` (DeepL → user's browser language)

### State Management

- **`context/LangContext.tsx`**: Global language state + UI translation cache. All UI strings go through `useTranslation()` hook; Spanish is the source language; DeepL handles everything else.
- **`context/MapsContext.tsx`**: Holds the single Google Maps API loader instance to prevent re-initialization.
- No external state library — React Context + `useState` only.

### API Routes (`app/api/`)

| Route | Purpose |
|---|---|
| `interpretQuery/` | Natural language → `{ category, tags[] }` using keyword/alias matching |
| `translate/` | Single text → Spanish via DeepL (used for content) |
| `translateUI/` | Batch UI strings → target language via DeepL |

Note: `interpretQuery` uses keyword matching with aliases (e.g. "restaurant" → "comida", "hotel" → "hospedaje"), not a live Claude API call — despite the file in `services/ia.ts`.

### Supabase

No ORM or migrations in the repo. Schema is managed via the Supabase dashboard. The client singleton lives in `services/supabase.ts`. Auth uses PKCE flow; React Strict Mode is disabled in `next.config.ts` to avoid Supabase auth lock conflicts.

### Business Entity (`types/negocio.ts`)

Key fields: `id`, `name`, `category`, `description`, `rating`, `tags` (comma-separated string), `lat`/`lng`, `owner_id`, `image_url`, `images[]`, `status`, `phone`, `website`, `opening_hours`.

Categories: `comida`, `tours`, `hospedaje`, `artesanias`, `entretenimiento`

### Image Uploads

Cloudinary handles image uploads via unsigned client-side upload (`services/cloudinary.ts`). Images are stored under `xploramx/negocios/`.

### Path Alias

`@/*` maps to the project root. Use `@/services/...`, `@/component/...`, etc.
