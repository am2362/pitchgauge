import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Crown, Zap, CreditCard, Loader2, CheckCircle } from "lucide-react";
import AppNavbar from "@/components/AppNavbar";
import { supabase } from "@/lib/supabase-external";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/usePageMeta";

const Billing = () => {
  usePageMeta("Billing | PitchGauge", "Manage your PitchGauge subscription and billing.");
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    tier, isLoading, monthlyAnalysisCount, remainingAnalyses,
    canCompare, canBulkAnalyze, subscriptionEnd,
    startCheckout, openCustomerPortal, refresh,
  } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
    });
  }, [navigate]);

  const handleUpgrade = async (targetTier: "pro" | "scale") => {
    setCheckoutLoading(targetTier);
    try {
      await startCheckout(targetTier);
    } catch {
      toast({ title: "Error", description: "Failed to start checkout. Please try again.", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      await openCustomerPortal();
    } catch {
      toast({ title: "Error", description: "Failed to open billing portal. Please try again.", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const tierBadgeVariant = tier === "free" ? "secondary" : "default";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <AppNavbar />
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Billing</h1>

        <div className="space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <CardTitle>Current Plan</CardTitle>
              </div>
              <CardDescription>Your subscription details and usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Plan:</span>
                    <Badge variant={tierBadgeVariant} className="capitalize text-sm">{tier}</Badge>
                  </div>

                  {subscriptionEnd && tier !== "free" && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Next billing date</span>
                      <span className="font-medium">{new Date(subscriptionEnd).toLocaleDateString()}</span>
                    </div>
                  )}

                  {tier === "free" && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monthly Analyses Used</span>
                        <span className="font-medium">{monthlyAnalysisCount} / 3</span>
                      </div>
                      <Progress value={(monthlyAnalysisCount / 3) * 100} className="h-2" />
                    </div>
                  )}

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Single Analyses</span>
                      <span>{tier === "free" ? `${remainingAnalyses} remaining today` : "Unlimited"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Comparison Mode</span>
                      <span className="flex items-center gap-1">
                        {canCompare ? <><CheckCircle className="h-3.5 w-3.5 text-primary" /> Available</> : "Pro required"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bulk Analysis</span>
                      <span className="flex items-center gap-1">
                        {canBulkAnalyze ? <><CheckCircle className="h-3.5 w-3.5 text-primary" /> Available</> : "Scale required"}
                      </span>
                    </div>
                  </div>

                  {tier !== "free" && (
                    <Button variant="outline" className="w-full gap-2" onClick={handleManage} disabled={portalLoading}>
                      {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      Manage Subscription
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Upgrade Options */}
          {tier !== "scale" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle>Upgrade</CardTitle>
                </div>
                <CardDescription>Get more from PitchGauge</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tier === "free" && (
                  <div className="rounded-lg border border-primary/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2"><Crown className="h-4 w-4 text-primary" /> Pro</h3>
                        <p className="text-sm text-muted-foreground">Unlimited analyses + Comparison mode</p>
                      </div>
                      <span className="text-lg font-bold">$29<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
                    </div>
                    <Button className="w-full" onClick={() => handleUpgrade("pro")} disabled={checkoutLoading === "pro"}>
                      {checkoutLoading === "pro" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Upgrade to Pro
                    </Button>
                  </div>
                )}

                <div className="rounded-lg border border-primary/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Scale</h3>
                      <p className="text-sm text-muted-foreground">Everything in Pro + Bulk analysis</p>
                    </div>
                    <span className="text-lg font-bold">$89<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
                  </div>
                  <Button className="w-full" onClick={() => handleUpgrade("scale")} disabled={checkoutLoading === "scale"}>
                    {checkoutLoading === "scale" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Upgrade to Scale
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;
