import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase-external";
import { isDemoAccount } from "@/lib/demo-accounts";

export type SubscriptionTier = "free" | "pro" | "scale";

interface DailyUsageCounts {
  single_analysis: number;
  comparison_analysis: number;
  bulk_analysis: number;
}

interface SubscriptionState {
  tier: SubscriptionTier;
  status: string;
  isLoading: boolean;
  monthlyAnalysisCount: number;
  dailyUsage: DailyUsageCounts;
  subscriptionEnd: string | null;
  isDemoAccount: boolean;
}

export const DAILY_LIMITS: Record<SubscriptionTier, { single_analysis: number; comparison_analysis: number; bulk_analysis: number }> = {
  free:  { single_analysis: 3,   comparison_analysis: 0,  bulk_analysis: 0 },
  pro:   { single_analysis: 50,  comparison_analysis: 10, bulk_analysis: 0 },
  scale: { single_analysis: 100, comparison_analysis: 20, bulk_analysis: 3 },
};

export const DEMO_DAILY_LIMITS = {
  single_analysis: 20,
  comparison_analysis: 10,
  bulk_analysis: 3,
} as const;

const TIER_LIMITS = {
  free: { monthlyAnalyses: 3, canCompare: false, canBulkAnalyze: false },
  pro: { monthlyAnalyses: Infinity, canCompare: true, canBulkAnalyze: false },
  scale: { monthlyAnalyses: Infinity, canCompare: true, canBulkAnalyze: true },
} as const;


export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    tier: "free",
    status: "active",
    isLoading: true,
    monthlyAnalysisCount: 0,
    dailyUsage: { single_analysis: 0, comparison_analysis: 0, bulk_analysis: 0 },
    subscriptionEnd: null,
    isDemoAccount: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncWithStripe = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState(s => ({ ...s, isLoading: false }));
        return;
      }

      // Check admin status server-side first
      const { data: adminData } = await supabase.functions.invoke("check-admin");
      
      if (adminData?.isAdmin) {
        setState({ tier: "scale", status: "active", isLoading: false, monthlyAnalysisCount: 0, dailyUsage: { single_analysis: 0, comparison_analysis: 0, bulk_analysis: 0 }, subscriptionEnd: null, isDemoAccount: false });
        return;
      }

      const isDemo = isDemoAccount(session.user.email);

      const { data, error } = await supabase.functions.invoke("check-subscription");

      if (error) {
        console.error("Error checking subscription:", error);
        await loadFromDB(session.user.id, session.user.email ?? undefined);
        return;
      }

      const tier = (data?.tier as SubscriptionTier) || "free";
      const subscriptionEnd = data?.subscription_end || null;

      const usageResult = await supabase.rpc("get_monthly_usage_count", { p_action_type: "single_analysis" });
      const monthlyAnalysisCount = (usageResult.data as number) || 0;

      // Fetch daily usage counts for all features
      const [dailySingle, dailyCompare, dailyBulk] = await Promise.all([
        supabase.rpc("get_daily_usage_count", { p_action_type: "single_analysis" }),
        supabase.rpc("get_daily_usage_count", { p_action_type: "comparison_analysis" }),
        supabase.rpc("get_daily_usage_count", { p_action_type: "bulk_analysis" }),
      ]);

      setState({
        tier,
        status: "active",
        isLoading: false,
        monthlyAnalysisCount,
        dailyUsage: {
          single_analysis: (dailySingle.data as number) || 0,
          comparison_analysis: (dailyCompare.data as number) || 0,
          bulk_analysis: (dailyBulk.data as number) || 0,
        },
        subscriptionEnd,
        isDemoAccount: isDemo,
      });
    } catch (error) {
      console.error("Error syncing subscription:", error);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  const loadFromDB = useCallback(async (userId: string, email?: string) => {
    try {
      if (email) {
        const { data: adminData } = await supabase.functions.invoke("check-admin");
        if (adminData?.isAdmin) {
          setState({ tier: "scale", status: "active", isLoading: false, monthlyAnalysisCount: 0, dailyUsage: { single_analysis: 0, comparison_analysis: 0, bulk_analysis: 0 }, subscriptionEnd: null, isDemoAccount: false });
          return;
        }
      }
      const [subResult, usageResult] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("tier, status, current_period_end")
          .eq("user_id", userId)
          .single(),
        supabase.rpc("get_monthly_usage_count", { p_action_type: "single_analysis" }),
      ]);

      const tier = (subResult.data?.tier as SubscriptionTier) || "free";
      const status = subResult.data?.status || "active";
      const monthlyAnalysisCount = (usageResult.data as number) || 0;
      const subscriptionEnd = subResult.data?.current_period_end || null;

      setState({ tier, status, isLoading: false, monthlyAnalysisCount, dailyUsage: { single_analysis: 0, comparison_analysis: 0, bulk_analysis: 0 }, subscriptionEnd, isDemoAccount: isDemoAccount(email) });
    } catch (error) {
      console.error("Error loading subscription from DB:", error);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    syncWithStripe();

    intervalRef.current = setInterval(syncWithStripe, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [syncWithStripe]);

  const tierLimits = TIER_LIMITS[state.tier];
  const dailyLimits = state.isDemoAccount ? DEMO_DAILY_LIMITS : DAILY_LIMITS[state.tier];

  const canCompareByEntitlement = state.isDemoAccount ? true : tierLimits.canCompare;
  const canBulkByEntitlement = state.isDemoAccount ? true : tierLimits.canBulkAnalyze;

  const dailyAnalysisLimitReached = state.dailyUsage.single_analysis >= dailyLimits.single_analysis;
  const dailyCompareLimitReached = dailyLimits.comparison_analysis === 0 || state.dailyUsage.comparison_analysis >= dailyLimits.comparison_analysis;
  const dailyBulkLimitReached = dailyLimits.bulk_analysis === 0 || state.dailyUsage.bulk_analysis >= dailyLimits.bulk_analysis;

  const canAnalyze = !dailyAnalysisLimitReached;
  const canCompare = canCompareByEntitlement && !dailyCompareLimitReached;
  const canBulkAnalyze = canBulkByEntitlement && !dailyBulkLimitReached;
  const remainingAnalyses = Math.max(0, dailyLimits.single_analysis - state.dailyUsage.single_analysis);

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
        setState(s => ({
          ...s,
          monthlyAnalysisCount: s.monthlyAnalysisCount + 1,
          dailyUsage: { ...s.dailyUsage, single_analysis: s.dailyUsage.single_analysis + 1 },
        }));
      } else if (actionType === "comparison_analysis") {
        setState(s => ({
          ...s,
          dailyUsage: { ...s.dailyUsage, comparison_analysis: s.dailyUsage.comparison_analysis + 1 },
        }));
      } else if (actionType === "bulk_analysis") {
        setState(s => ({
          ...s,
          dailyUsage: { ...s.dailyUsage, bulk_analysis: s.dailyUsage.bulk_analysis + 1 },
        }));
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

      const { data, error } = await supabase.functions.invoke("customer-portal");

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
    monthlyAnalysisCount: state.monthlyAnalysisCount,
    dailyDemoUsageCount: 0,
    dailyUsage: state.dailyUsage,
    dailyLimits,
    subscriptionEnd: state.subscriptionEnd,
    isDemoAccount: state.isDemoAccount,
    demoLimitReached: false,
    demoLimitMessage: "",
    dailyAnalysisLimitReached,
    dailyCompareLimitReached,
    dailyBulkLimitReached,
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
