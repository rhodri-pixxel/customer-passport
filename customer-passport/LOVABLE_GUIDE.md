# Pixxel Customer Passport — Lovable Deployment

You have two ways to get this live. **Option A is simpler** if you just want a URL fast.

---

## OPTION A — GitHub → Lovable Import (recommended)

This keeps everything in your control and is the cleanest path.

### Step 1 — Push to your own GitHub
```bash
# Unzip pixxel-passport-app.zip somewhere, then:
cd lovable-deploy

git init
git branch -M main
git add .
git commit -m "Pixxel Customer Passport — Beta"

# Create a new empty repo on github.com (e.g. "customer-passport"), then:
git remote add origin git@github.com:YOUR_USERNAME/customer-passport.git
git push -u origin main
```

### Step 2 — Import into Lovable
1. Go to **lovable.dev** → sign in
2. **New Project** → **Import from GitHub**
3. Authorise + select your `customer-passport` repo
4. Lovable auto-detects Vite + React

### Step 3 — Set environment variables (in Lovable project settings)
| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://plspunlkmkvplgcsncpa.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (your anon key from Supabase → Settings → API) |

### Step 4 — Deploy
Lovable builds and gives you a `*.lovable.app` URL. Done.

---

## OPTION B — Build fresh in Lovable with a prompt

If you'd rather have Lovable scaffold it and you paste the app in, use the
prompt below. But honestly, Option A is less error-prone since the app is
already built and tested.

---

## THE LOVABLE PROMPT
(Use this if starting fresh in Lovable, or to have Lovable understand the project)

```
I'm importing an existing single-file React app called the Pixxel Customer
Passport — an internal sales handover tool. It's already built and connects
to a Supabase backend. Please set it up as a Vite + React project.

TECH STACK:
- Vite + React 18
- lucide-react for icons (v0.383.0)
- Connects to Supabase via REST (no @supabase/supabase-js needed — it uses
  plain fetch calls)
- No CSS framework — all styles are inline in a <style> tag in the component

THE APP:
- Main component is in src/CustomerPassport.jsx (single file, ~2900 lines)
- Entry point src/main.jsx renders <App />
- It reads two environment variables:
  VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
  (falls back to hardcoded values if not set, so it works either way)

WHAT IT DOES:
- Pulls live deals from a Supabase database (synced from HubSpot)
- Shows a filterable deal list across 6 sales pipelines
- Each deal opens a "passport" with 5 tabs: Profile, Context, Execution,
  Notes, Customer Feedback
- Assign SE/CS/Analytics owners — fires Slack + email notifications via
  Supabase edge functions
- A leadership dashboard with pipeline stats

DO NOT:
- Add a CSS framework (Tailwind etc.) — styles are already inline
- Modify the Supabase connection logic
- Change the visual design — the spectral/earth-observation theme is intentional

Please set up index.html, vite.config.js, and package.json with the
dependencies above, then I'll paste in the component files.
```

---

## After deployment — smoke test

1. Open the URL → deal list loads your real pipelines (UP42, Terrasos, etc.)
2. Use the pipeline filter dropdown → switches between the 6 core pipelines
3. Open a deal → passport detail loads
4. Switch to Leadership view → see pipeline stats
5. (Optional) Assign an owner → check #customer-passport in Slack

If the deal list is empty but no errors show, double-check the two
environment variables are set correctly in Lovable.

---

## What's already working behind the app
- ✅ Supabase database with 743 real HubSpot deals
- ✅ Auto-sync every 30 min (once you run recurring_sync.sql)
- ✅ Slack notifications → #customer-passport
- ✅ Email notifications via Resend
- ✅ HubSpot stage/pipeline mapping

The app is the front door; all of that runs regardless of where the
front-end is hosted.
