import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionTier = "free" | "pro" | "scale";

interface SubscriptionState {
  tier: SubscriptionTier;
  status: string;
  isLoading: boolean;
  dailyAnalysisCount: number;
}

const TIER_LIMITS = {
  free: { dailyAnalyses: 3, canCompare: false, canBulkAnalyze: false },
  pro: { dailyAnalyses: Infinity, canCompare: true, canBulkAnalyze: false },
  scale: { dailyAnalyses: Infinity, canCompare: true, canBulkAnalyze: true },
} as const;

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    tier: "free",
    status: "active",
    isLoading: true,
    dailyAnalysisCount: 0,
  });

  const loadSubscription = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState(s => ({ ...s, isLoading: false }));
        return;
      }

      const [subResult, usageResult] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("tier, status")
          .eq("user_id", user.id)
          .single(),
        supabase.rpc("get_daily_usage_count", { p_action_type: "single_analysis" }),
      ]);

      const tier = (subResult.data?.tier as SubscriptionTier) || "free";
      const status = subResult.data?.status || "active";
      const dailyAnalysisCount = (usageResult.data as number) || 0;

      setState({ tier, status, isLoading: false, dailyAnalysisCount });
    } catch (error) {
      console.error("Error loading subscription:", error);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const limits = TIER_LIMITS[state.tier];

  const canAnalyze = state.tier !== "free" || state.dailyAnalysisCount < limits.dailyAnalyses;
  const canCompare = limits.canCompare;
  const canBulkAnalyze = limits.canBulkAnalyze;
  const remainingAnalyses = state.tier === "free" 
    ? Math.max(0, limits.dailyAnalyses - state.dailyAnalysisCount) 
    : Infinity;

  const recordUsage = useCallback(async (actionType: string, metadata?: Record<string, unknown>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("usage_tracking").insert([{
        user_id: user.id,
        action_type: actionType,
        metadata: metadata || null,
      }]);

      // Refresh counts
      if (actionType === "single_analysis") {
        setState(s => ({ ...s, dailyAnalysisCount: s.dailyAnalysisCount + 1 }));
      }
    } catch (error) {
      console.error("Error recording usage:", error);
    }
  }, []);

  return {
    tier: state.tier,
    status: state.status,
    isLoading: state.isLoading,
    dailyAnalysisCount: state.dailyAnalysisCount,
    canAnalyze,
    canCompare,
    canBulkAnalyze,
    remainingAnalyses,
    recordUsage,
    refresh: loadSubscription,
  };
}
