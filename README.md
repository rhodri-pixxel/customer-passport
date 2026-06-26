# Pixxel Customer Passport

Internal SE → CS → Analytics handover tool.

**Version 1.0** — first release pushed to production on **26 June 2026**.

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

See [WORKFLOW.md](WORKFLOW.md) for the staging → production process (edit on
`staging`, test on the preview, then promote to `main`).

## Env vars (set in Vercel)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
