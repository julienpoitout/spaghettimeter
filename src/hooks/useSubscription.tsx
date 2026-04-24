import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStripeEnvironment } from "@/lib/stripe";

const FREE_WEEKLY_LIMIT = 3;
const FREE_SAVED_LIMIT = 1;

export interface SubscriptionState {
  isPro: boolean;
  isLoading: boolean;
  weeklyUsed: number;
  weeklyLimit: number | null; // null = unlimited
  savedCount: number;
  savedLimit: number | null; // null = unlimited
  remainingAnalyses: number | null;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyUsed, setWeeklyUsed] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setIsPro(false);
      setWeeklyUsed(0);
      setSavedCount(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const env = getStripeEnvironment();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [subRes, usageRes, savedRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("status,current_period_end,price_id")
          .eq("user_id", user.id)
          .eq("environment", env)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("analysis_usage")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", sevenDaysAgo),
        supabase
          .from("saved_analyses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      const sub = subRes.data;
      const active =
        !!sub &&
        ((["active", "trialing", "past_due"].includes(sub.status) &&
          (!sub.current_period_end || new Date(sub.current_period_end) > new Date())) ||
          (sub.status === "canceled" &&
            sub.current_period_end &&
            new Date(sub.current_period_end) > new Date()));
      setIsPro(!!active);
      setWeeklyUsed(usageRes.count ?? 0);
      setSavedCount(savedRes.count ?? 0);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime — refetch on subscription changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`sub-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => fetchAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAll]);

  const weeklyLimit = isPro ? null : FREE_WEEKLY_LIMIT;
  const savedLimit = isPro ? null : FREE_SAVED_LIMIT;
  const remainingAnalyses = isPro ? null : Math.max(0, FREE_WEEKLY_LIMIT - weeklyUsed);

  return {
    isPro,
    isLoading,
    weeklyUsed,
    weeklyLimit,
    savedCount,
    savedLimit,
    remainingAnalyses,
    refresh: fetchAll,
  };
}