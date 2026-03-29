

## Alternative: GitHub Public Repo Browser (No OAuth Required)

Since GitHub OAuth isn't available in Lovable Cloud, we can still improve the UX by letting users **browse and select public repos by GitHub username** — no login required.

### How it works

1. User enters their GitHub username in a new input field
2. App calls the GitHub public API (`GET /users/{username}/repos`) to list their public repositories
3. Repos are displayed in a selectable list (name, description, language, stars)
4. User clicks a repo to auto-fill the URL and trigger analysis

### Technical details

- **No auth needed** — GitHub's public API allows unauthenticated requests (60 requests/hour per IP)
- **New component**: `RepoSelector.tsx` — username input + repo list UI
- **Changes to `Index.tsx`**: Add the repo selector above or alongside the URL input; selecting a repo sets the `repoUrl` state
- **GitHub API**: `https://api.github.com/users/{username}/repos?sort=updated&per_page=30`

### Limitations

- Only public repos are visible (private repos require OAuth)
- Rate limited to 60 requests/hour without a token

This gives users a convenient way to find and select their repos without needing GitHub OAuth.

