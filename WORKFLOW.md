# Dev → Production Workflow

How to make changes safely and ship them to production.

- **`main`** = production. Pushing to it auto-deploys to Vercel (`customer-passport.vercel.app`).
- **`staging`** = where edits are tested first, via a Vercel preview deployment.
- **Never edit `main` directly.** Always go through `staging`.

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
