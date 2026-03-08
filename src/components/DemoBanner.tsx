import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";

export function DemoBanner() {
  const navigate = useNavigate();

  return (
    <div className="w-full bg-[hsl(48_96%_53%)] text-[hsl(30_20%_15%)] py-2.5 px-4">
      <div className="container max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          <span>You are in demo mode — sign up free to analyse your own pitches</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs bg-[hsl(0_0%_100%/0.9)] border-[hsl(30_20%_15%/0.3)] text-[hsl(30_20%_15%)] hover:bg-[hsl(0_0%_100%)]"
          onClick={() => navigate("/auth")}
        >
          Sign Up Free <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
