# Pixxel Customer Passport

Internal SE → CS → Analytics handover tool.

## Structure
```
/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx              # entry point (includes Buffer polyfill)
    └── CustomerPassport.jsx  # the entire app
```

## Stack
Vite + React + Supabase + Vercel.

## Local dev
```bash
npm install
npm run dev
```

## Deploy
Push to `main` → Vercel auto-deploys. Vercel builds from the repo ROOT.
Do NOT nest the project inside subfolders.

## Env vars (set in Vercel)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
