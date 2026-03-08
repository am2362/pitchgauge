import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase-external";

export type SubscriptionTier = "free" | "pro" | "scale";

interface SubscriptionState {
  tier: SubscriptionTier;
  status: string;
  isLoading: boolean;
  dailyAnalysisCount: number;
  subscriptionEnd: string | null;
}

const TIER_LIMITS = {
  free: { dailyAnalyses: 3, canCompare: false, canBulkAnalyze: false },
  pro: { dailyAnalyses: Infinity, canCompare: true, canBulkAnalyze: false },
  scale: { dailyAnalyses: Infinity, canCompare: true, canBulkAnalyze: true },
} as const;

const ADMIN_WHITELIST = [
  "amandayung808@gmail.com",
  "amandaywy2015@gmail.com",
  "c74661985@gmail.com",
];

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    tier: "free",
    status: "active",
    isLoading: true,
    dailyAnalysisCount: 0,
    subscriptionEnd: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncWithStripe = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState(s => ({ ...s, isLoading: false }));
        return;
      }

      if (session.user.email && ADMIN_WHITELIST.includes(session.user.email)) {
        setState({ tier: "scale", status: "active", isLoading: false, dailyAnalysisCount: 0, subscriptionEnd: null });
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        console.error("Error checking subscription:", error);
        // Fallback to DB query
        await loadFromDB(session.user.id, session.user.email ?? undefined);
        return;
      }

      const tier = (data?.tier as SubscriptionTier) || "free";
      const subscriptionEnd = data?.subscription_end || null;

      // Also get daily usage count
      const usageResult = await supabase.rpc("get_daily_usage_count", { p_action_type: "single_analysis" });
      const dailyAnalysisCount = (usageResult.data as number) || 0;

      setState({
        tier,
        status: "active",
        isLoading: false,
        dailyAnalysisCount,
        subscriptionEnd,
      });
    } catch (error) {
      console.error("Error syncing subscription:", error);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  const loadFromDB = useCallback(async (userId: string, email?: string) => {
    try {
      if (email && ADMIN_WHITELIST.includes(email)) {
        setState({ tier: "scale", status: "active", isLoading: false, dailyAnalysisCount: 0, subscriptionEnd: null });
        return;
      }
      const [subResult, usageResult] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("tier, status, current_period_end")
          .eq("user_id", userId)
          .single(),
        supabase.rpc("get_daily_usage_count", { p_action_type: "single_analysis" }),
      ]);

      const tier = (subResult.data?.tier as SubscriptionTier) || "free";
      const status = subResult.data?.status || "active";
      const dailyAnalysisCount = (usageResult.data as number) || 0;
      const subscriptionEnd = subResult.data?.current_period_end || null;

      setState({ tier, status, isLoading: false, dailyAnalysisCount, subscriptionEnd });
    } catch (error) {
      console.error("Error loading subscription from DB:", error);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    syncWithStripe();

    // Refresh every 60s
    intervalRef.current = setInterval(syncWithStripe, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [syncWithStripe]);

  const limits = TIER_LIMITS[state.tier];

  const canAnalyze = state.tier !== "free" || state.dailyAnalysisCount < limits.dailyAnalyses;
  const canCompare = limits.canCompare;
  const canBulkAnalyze = limits.canBulkAnalyze;
  const remainingAnalyses = state.tier === "free"
    ? Math.max(0, limits.dailyAnalyses - state.dailyAnalysisCount)
    : Infinity;

  const recordUsage = useCallback(async (actionType: string, metadata?: Record<string, string>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("usage_tracking").insert([{
        user_id: user.id,
        action_type: actionType,
        metadata: metadata || null,
      }]);

      if (actionType === "single_analysis") {
        setState(s => ({ ...s, dailyAnalysisCount: s.dailyAnalysisCount + 1 }));
      }
    } catch (error) {
      console.error("Error recording usage:", error);
    }
  }, []);

  const startCheckout = useCallback(async (tier: "pro" | "scale") => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { tier },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error starting checkout:", error);
      throw error;
    }
  }, []);

  const openCustomerPortal = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      throw error;
    }
  }, []);

  return {
    tier: state.tier,
    status: state.status,
    isLoading: state.isLoading,
    dailyAnalysisCount: state.dailyAnalysisCount,
    subscriptionEnd: state.subscriptionEnd,
    canAnalyze,
    canCompare,
    canBulkAnalyze,
    remainingAnalyses,
    recordUsage,
    startCheckout,
    openCustomerPortal,
    refresh: syncWithStripe,
  };
}
