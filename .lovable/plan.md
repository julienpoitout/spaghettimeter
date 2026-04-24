# Subscriptions, Usage Limits & Saved-Analyses Dashboard

## What you'll get

1. **Three plans** enforced server-side:
   - **Guest (anonymous):** 3 public-repo analyses per rolling 7 days, no save, no private repos.
   - **Free (signed-in):** 3 analyses / rolling 7 days, 1 saved analysis, can use a GitHub token for private repos.
   - **Pro ($2.99/month):** unlimited analyses, unlimited saved analyses, private repos.

2. **Account requirement for private repos.** Pasting a GitHub token now requires being signed in. Guests connecting a token get redirected to `/auth` first.

3. **Pricing page** at `/pricing` with a "Choose Free" and "Subscribe — $2.99/mo" button. Subscribe opens Stripe Checkout in a new tab.

4. **Saved analyses dashboard** at `/dashboard`:
   - Table of saved scans (repo, score, date, actions).
   - Per-repo **score-over-time line chart** when 2+ scans exist for the same repo.
   - **Compare mode**: pick any two saved scans of the same repo → side-by-side diff of score, breakdown, and suggestions.
   - **Re-run** button: one-click re-analyze, appended to that repo's history.
   - **Save** action on every fresh analysis result (disabled with upsell tooltip if Free user already has 1 saved).

5. **Usage indicator** in the header for signed-in users ("2 / 3 analyses this week — Upgrade").

## How it works (technical)

### Payments — Stripe (built-in)

- Use Lovable's seamless Stripe integration (no API key needed from you).
- Run the eligibility check, then enable Stripe payments.
- Create one product: **SpaghettiMeter Pro — $2.99/month recurring**.
- Tax handling: **calculation only** (option 2) — keeps it simple for a global SaaS at this price point. Confirm with you at enable-time.
- Checkout flow: signed-in user clicks Subscribe → edge function `create-checkout` returns Stripe Checkout URL → opens in new tab → Stripe webhook `stripe-webhook` updates `subscriptions` table → success page polls subscription status.
- Customer portal via edge function `customer-portal` for managing/cancelling.

### Database (new tables, RLS enabled)

```text
subscriptions
  user_id (uuid, PK, fk auth.users)
  stripe_customer_id (text)
  stripe_subscription_id (text)
  plan ('free' | 'pro')
  status ('active' | 'canceled' | 'past_due' | 'incomplete')
  current_period_end (timestamptz)
  updated_at

analysis_usage         -- one row per analysis run, used for rate-limiting
  id (uuid)
  user_id (uuid, nullable)
  guest_fingerprint (text, nullable) -- sha256(ip + ua) for anonymous users
  repo_url (text)
  created_at (timestamptz, default now())

saved_analyses
  id (uuid)
  user_id (uuid, fk auth.users)
  repo_url (text)
  score (numeric)
  summary (text)
  breakdown (jsonb)
  suggestions (jsonb)
  created_at (timestamptz)
  -- index on (user_id, repo_url, created_at desc) for history charts
```

RLS:
- `subscriptions`: user can SELECT own row; only service role can INSERT/UPDATE (webhook).
- `analysis_usage`: service role only (written by edge function, never client).
- `saved_analyses`: user can SELECT/INSERT/DELETE own rows.

Helper SQL function `get_user_plan(uid)` returning `'free' | 'pro'` based on active subscription, used by edge functions.

### Edge functions (new + modified)

- **`analyze-repo` (modified):** before running the analysis,
  1. Identify caller: signed-in `user_id` (from JWT) or `guest_fingerprint` (sha256 of IP + user-agent).
  2. If `githubToken` provided AND no `user_id` → return 401 "Sign in required for private repos".
  3. Look up plan; for Free / Guest, count rows in `analysis_usage` in the last 7 days. If ≥ 3, return 429 with `{ reason: 'quota', plan, used, limit, upgradeUrl: '/pricing' }`.
  4. On success, insert row into `analysis_usage`.

- **`save-analysis` (new):** auth required. For Free users, reject if a saved analysis already exists (return upgrade hint). For Pro, always insert.

- **`create-checkout` (new):** auth required. Creates Stripe Checkout session for the Pro price, returns URL.

- **`customer-portal` (new):** auth required. Creates Stripe billing portal session.

- **`stripe-webhook` (new):** verifies Stripe signature, upserts `subscriptions` on `customer.subscription.{created,updated,deleted}`. Configured with `verify_jwt = false`.

### Frontend changes

- **`useSubscription` hook:** fetches the user's plan + usage counters, exposes `plan`, `usedThisWeek`, `limit`, `savedCount`, `savedLimit`, `isPro`.
- **`GitHubConnect.tsx`:** if user is not signed in when opening the dialog, replace body with "Sign in required to analyze private repos" + button to `/auth?next=/`.
- **`Index.tsx`:**
  - Show usage chip in header for signed-in users.
  - On 429 quota error from `analyze-repo`, show upgrade modal instead of generic toast.
  - On successful analysis, show a "💾 Save to dashboard" button (calls `save-analysis`); disabled with tooltip + upgrade CTA for Free users at limit.
- **`/pricing` (new page):** two cards (Free / Pro $2.99/mo) with feature lists. Pro button → calls `create-checkout` → `window.open(url, '_blank')`. Includes Seo + JSON-LD `Product`/`Offer` for SEO.
- **`/dashboard` (new page, protected):**
  - Header: plan badge, "Manage billing" button (Pro) or "Upgrade" (Free).
  - Saved analyses grouped by `repo_url`. Each group shows latest score + sparkline.
  - Click a repo → detail view with full history table, score-over-time line chart (Recharts), and "Compare" mode (checkboxes to pick 2 scans → side-by-side diff panel).
  - Re-run button on each repo → re-invokes `analyze-repo` and `save-analysis`.
- **Header navigation:** add Dashboard + Pricing links for signed-in users; Pricing only for guests.
- **Auth.tsx:** support `?next=` query param to redirect after login.

### Diff view (compare two scans)

```text
┌─ scan A (2026-04-10) ─┐  ┌─ scan B (2026-04-24) ─┐
│ Score: 6.2            │  │ Score: 4.8 ▼ -1.4    │
│ Breakdown:            │  │ Breakdown:            │
│  Naming: poor         │  │  Naming: good ▲      │
│  ...                  │  │  ...                  │
│ Suggestions: 8        │  │ Suggestions: 5 ▼     │
└───────────────────────┘  └───────────────────────┘
```

### Files touched

Created: `src/pages/Pricing.tsx`, `src/pages/Dashboard.tsx`, `src/components/SavedAnalysisDetail.tsx`, `src/components/CompareAnalyses.tsx`, `src/components/UsageBadge.tsx`, `src/components/UpgradeModal.tsx`, `src/hooks/useSubscription.ts`, `supabase/functions/{create-checkout,customer-portal,stripe-webhook,save-analysis}/index.ts`, migration for new tables + RLS + `get_user_plan`.

Edited: `src/App.tsx` (routes), `src/pages/Index.tsx` (save button, quota handling, header), `src/pages/Auth.tsx` (`?next` redirect), `src/components/GitHubConnect.tsx` (sign-in gate), `supabase/functions/analyze-repo/index.ts` (quota + auth checks), `supabase/config.toml` (new functions, `verify_jwt = false` for webhook).

## Order of operations

1. Run Stripe eligibility check → enable built-in Stripe → create the $2.99/mo product.
2. Database migration (subscriptions, analysis_usage, saved_analyses, RLS, helper function).
3. Backend: stripe-webhook + create-checkout + customer-portal + save-analysis; modify analyze-repo for quota & auth.
4. Frontend: useSubscription hook, Pricing page, Dashboard page, save button on results, header upsell, GitHubConnect sign-in gate, Auth `?next` redirect.
5. Smoke test the flow (free quota → upgrade → unlimited → save → compare).