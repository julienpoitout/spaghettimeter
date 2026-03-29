

## Investigation: Sign Out Button Not Working

**Root cause:** The `signOut` function in `useAuth.tsx` calls `supabase.auth.signOut()` but only clears `isAdmin`. It relies on `onAuthStateChange` to clear `user` and `session`, but the async `checkAdmin` call in that listener can cause the UI to stay stale.

**Fix in `src/hooks/useAuth.tsx`:** Update the `signOut` function to immediately clear all local state:

```ts
const signOut = async () => {
  await supabase.auth.signOut();
  setSession(null);
  setUser(null);
  setIsAdmin(false);
};
```

This ensures the UI updates instantly without depending on the auth state change listener's async behavior.

**Single file change**, ~3 lines modified.

