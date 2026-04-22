

## Goal
Allow users to analyze their **private** GitHub repositories with SpaghettiMeter.

## The Challenge
Private repos require authenticated GitHub API requests. The current app calls GitHub anonymously, which only works for public repos. We need a way to authenticate as the user against GitHub.

Lovable Cloud's built-in auth doesn't support GitHub OAuth natively, so we have two viable paths. I recommend **Option A** for fastest delivery and best UX; **Option B** is more work but gives a true "Sign in with GitHub" flow.

---

## Option A (Recommended): Personal Access Token (PAT)

Users paste a GitHub Personal Access Token (PAT) into the app. The token is used to authenticate API calls so private repos become visible and readable.

### User flow
1. User clicks "Connect GitHub" in the header
2. A modal explains how to create a PAT (with a direct link to GitHub's token creation page, pre-filled with the right scope: `repo`)
3. User pastes the token; it's stored **only in their browser** (`localStorage`), never sent to our database
4. Once connected:
   - `RepoSelector` lists **all** their repos (public + private) via `/user/repos`
   - The username field is no longer required — it auto-detects from the token
   - The `analyze-repo` edge function receives the token in the request and uses it when fetching file contents
5. A "Disconnect GitHub" button clears the token

### What changes
- **New component `GitHubConnect.tsx`**: header button + modal for pasting/managing the PAT, with clear setup instructions
- **New hook `useGitHubToken.ts`**: reads/writes token from `localStorage`, exposes `{token, setToken, clearToken, isConnected}`
- **`RepoSelector.tsx`**: when token present, call `https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&sort=updated&per_page=100` with `Authorization: Bearer <token>` header; show a private/public badge on each repo; keep the username flow as fallback when no token
- **`Index.tsx`**: pass the token to the edge function; show connection status
- **`analyze-repo/index.ts`**: accept optional `githubToken` in the request body and add `Authorization: Bearer <token>` to all GitHub API calls (tree fetch + file content fetch); also lifts the rate limit from 60 → 5000 req/hour

### Security notes
- Token lives only in the user's browser (`localStorage`) — we don't persist it server-side
- It's transmitted to our edge function over HTTPS only for the duration of one analysis
- The modal recommends a **fine-grained PAT** scoped to only the repos the user wants to analyze, with read-only `Contents` permission
- We display a clear warning about token handling and link to GitHub's docs

### Pros / Cons
- ✅ Ships in one iteration, no external OAuth app, no extra infra
- ✅ Works for both personal and organization repos the user has access to
- ⚠️ User has to create a PAT (one-time, ~1 minute with our guided link)

---

## Option B: Full GitHub OAuth (via custom edge function)

Build a real "Sign in with GitHub" button. Requires creating a GitHub OAuth App, storing the client ID/secret, and implementing the OAuth callback flow in two new edge functions (`github-oauth-start`, `github-oauth-callback`). Tokens are stored encrypted in a new `github_connections` table tied to the user's account.

This is ~3–4× more code, requires the user to register an OAuth App on GitHub, and only makes sense if you want a polished "one-click sign-in" experience.

---

## Recommendation
Go with **Option A**. It delivers the feature today, keeps tokens off our servers, and the PAT setup is a one-time 60-second task for the user. We can always upgrade to full OAuth (Option B) later if usage justifies it.

### Technical summary (Option A)
```text
Browser (localStorage: gh_token)
        │
        ├──► GitHub API directly  (RepoSelector lists private repos)
        │
        └──► Edge function "analyze-repo"
                  │  body: { repoUrl, githubToken }
                  ▼
              GitHub API (tree + raw contents, authenticated)
                  │
                  ▼
              Lovable AI Gateway → score
```

Files touched: `GitHubConnect.tsx` (new), `useGitHubToken.ts` (new), `RepoSelector.tsx`, `Index.tsx`, `supabase/functions/analyze-repo/index.ts`. No database changes.

