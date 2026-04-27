## Goal

Eliminate the visible "flash" when navigating to `/dashboard`. Today the page renders the header + a plain "Loading…" line while auth resolves and the query runs, then snaps to the real content (or the empty state). The shifting layout and content swap is what the user perceives as a flash.

## Approach

Make the loading state visually match the final state, and avoid rendering the page chrome until we know what to show.

### Changes in `src/pages/Dashboard.tsx`

1. **Combine loading flags.** Treat `authLoading || loading` as a single `isInitialLoading` state for first paint.

2. **Full-page loader while auth is resolving.** While `authLoading` is true (and we don't yet know if the user is signed in), render a centered, branded loader (spinning 🍝 + "Loading your dashboard…") on a full-height background instead of the dashboard scaffold. This prevents the "Back to scanner" header + "Loading…" text from briefly appearing before the redirect or the data.

3. **Skeleton history list instead of "Loading…" text.** Once we know the user is signed in but data is still fetching, render the full dashboard scaffold (header, title, section headings) with skeleton rows in the History section that match the size/shape of real analysis cards (using the existing `Skeleton` component from `@/components/ui/skeleton`). This keeps layout stable so the real cards fade in without shifting.

4. **Hide chart/compare sections during loading.** The "Score over time" and "Compare two analyses" sections only render when there is data, so they are already stable — no change needed beyond ensuring they don't appear during the skeleton phase.

5. **Subtle fade-in for loaded content.** Wrap the History list in a short framer-motion fade (≈150ms) so the transition from skeleton to real cards is smooth instead of an instant swap.

### Why this fixes the flash

- The redirect-to-auth path no longer briefly paints the dashboard chrome.
- The "Loading…" text → content swap is replaced by skeleton rows that occupy the same space as the real cards, so there is no layout shift.
- A small fade smooths the final hand-off.

## Technical notes

- Reuse existing `Skeleton` from `src/components/ui/skeleton.tsx`; no new deps.
- Keep current data-fetching logic (`fetchAnalyses`, auth gating in `useEffect`) unchanged — only the rendering branches change.
- Preserve the existing Italian-kitchen visual theme (spinning 🍝, primary/muted tokens, Fredoka display font). No raw color classes.
