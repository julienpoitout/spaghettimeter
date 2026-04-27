import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "gh_token";

/**
 * GitHub token storage strategy:
 * - Signed-in users: persisted in `user_github_tokens` (per-user, RLS-protected)
 *   so the token follows them across browsers/devices. Mirrored to localStorage
 *   as a synchronous cache for instant first paint.
 * - Guests: localStorage only.
 * - On sign-out we clear the localStorage cache so the next user on the same
 *   browser does not inherit the previous user's token.
 */
export function useGitHubToken() {
  const { user } = useAuth();
  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  // Sync with DB whenever the auth user changes.
  useEffect(() => {
    let cancelled = false;

    if (!user) {
      // Drop the cached token so the next account on this browser starts clean.
      localStorage.removeItem(STORAGE_KEY);
      setTokenState(null);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("user_github_tokens")
        .select("token")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("Failed to load GitHub token:", error);
        return;
      }
      const cached = localStorage.getItem(STORAGE_KEY);
      if (data?.token) {
        if (data.token !== cached) localStorage.setItem(STORAGE_KEY, data.token);
        setTokenState(data.token);
      } else if (cached) {
        // Migrate: user has a token in localStorage but none saved — persist it.
        await supabase
          .from("user_github_tokens")
          .upsert({ user_id: user.id, token: cached }, { onConflict: "user_id" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Cross-tab sync via the storage event.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setTokenState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setToken = useCallback(
    async (t: string) => {
      localStorage.setItem(STORAGE_KEY, t);
      setTokenState(t);
      if (user) {
        const { error } = await supabase
          .from("user_github_tokens")
          .upsert({ user_id: user.id, token: t }, { onConflict: "user_id" });
        if (error) console.error("Failed to save GitHub token:", error);
      }
    },
    [user],
  );

  const clearToken = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    setTokenState(null);
    if (user) {
      const { error } = await supabase
        .from("user_github_tokens")
        .delete()
        .eq("user_id", user.id);
      if (error) console.error("Failed to clear GitHub token:", error);
    }
  }, [user]);

  return { token, setToken, clearToken, isConnected: !!token };
}