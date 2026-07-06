# Dev → Production Workflow

How to make changes safely and ship them to production.

- **`main`** = production. Pushing to it auto-deploys to Vercel (`customer-passport.vercel.app`).
- **`staging`** = where edits are tested first, via a Vercel preview deployment.
- **Never edit `main` directly.** Always go through `staging`.

## Before you start (sync with the team)

Pull everyone else's changes down **before** you make your own, so your commits
land on top of theirs — this keeps the fast-forward promote (step 4) working.

```bash
cd path/to/customer-passport
git checkout main
git pull origin main        # teammates' production changes
git checkout staging
git pull origin staging     # teammates' staging changes
git merge main              # make sure staging also has anything new in main
```

Optional — peek at what changed first (never touches your files):
```bash
git fetch origin
git log --oneline origin/main -5
git log --oneline origin/staging -5
```

If a pull reports **conflict** or **diverged**, stop — you and a teammate edited
the same lines. Resolve carefully (or ask for help) before continuing.

## The cycle

**1. Start on the staging branch**
```bash
cd path/to/customer-passport   # wherever you cloned the repo
git checkout staging
```

**2. Make your edits, then commit them**
```bash
git add -A
git commit -m "Short description of the change"
```

**3. Push staging — this updates the preview link to test on**
```bash
git push origin staging
```
Preview: https://customer-passport-git-staging-rhodri-pixxel-s-projects.vercel.app

**4. When it works, promote staging to production**
```bash
git checkout main           # switch to the live branch
git merge --ff-only staging # bring staging's commits in
git push origin main        # deploys to production
git checkout staging        # back to staging for the next change
```

Repeat from step 2 for every future change.

## Notes

- `--ff-only` only allows a clean fast-forward. If it **errors**, `main` changed
  independently (e.g. someone else pushed) — reconcile before forcing anything.
- `.gitignore` keeps `node_modules/`, `.env.local`, and build output out of commits.
- A pull request is **optional** — only needed when you want the diff reviewed before merging.
- Local preview (if Node.js is available): `npm install` then `npm run dev`.

## Preview access (one-time, project-owner only)

Viewing a Vercel preview requires two gates to be open:

1. **Vercel** → customer-passport → Settings → Deployment Protection → turn
   **Vercel Authentication off for Preview** deployments.
2. **Supabase** → Authentication → URL Configuration → add the preview domain to
   **Redirect URLs**, e.g.
   `https://customer-passport-*-rhodri-pixxel-s-projects.vercel.app/**` —
   otherwise Google sign-in bounces back to the production Site URL.

The app authenticates users itself (Google sign-in restricted to `@pixxel.space` /
`@pixxel.co.in`), so opening previews to the team does not expose customer data.
