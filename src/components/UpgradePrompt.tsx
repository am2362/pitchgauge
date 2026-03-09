import { Lock, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SubscriptionTier } from "@/hooks/useSubscription";

interface UpgradePromptProps {
  requiredTier: "pro" | "scale";
  currentTier: SubscriptionTier;
  featureName: string;
  onUpgrade: (tier: "pro" | "scale") => void;
  isLoading?: boolean;
}

export function UpgradePrompt({ requiredTier, currentTier, featureName, onUpgrade, isLoading }: UpgradePromptProps) {
  const tierInfo = {
    pro: { label: "Pro", price: "$39/mo", icon: Crown },
    scale: { label: "Scale", price: "$99/mo", icon: Zap },
  };

  const info = tierInfo[requiredTier];
  const Icon = info.icon;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full border-primary/20">
        <CardContent className="pt-8 pb-6 text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{featureName} is Locked</h2>
            <p className="text-muted-foreground text-sm">
              {currentTier === "free" && requiredTier === "pro" && "Upgrade to Pro to unlock this feature."}
              {currentTier === "free" && requiredTier === "scale" && "Upgrade to Scale to unlock this feature."}
              {currentTier === "pro" && requiredTier === "scale" && "Upgrade to Scale to unlock this feature."}
            </p>
          </div>
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={() => onUpgrade(requiredTier)}
            disabled={isLoading}
          >
            <Icon className="h-4 w-4" />
            Upgrade to {info.label} — {info.price}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
