import { useState, useEffect } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { msg: "Analysing pitch content...", delay: 3000 },
  { msg: "Scoring evaluation criteria...", delay: 4000 },
  { msg: "Generating investment report...", delay: 5000 },
];

interface AnalysisProgressStepsProps {
  isActive: boolean;
}

export function AnalysisProgressSteps({ isActive }: AnalysisProgressStepsProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setStepIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, STEPS[stepIndex]?.delay || 3000);

    return () => clearInterval(timer);
  }, [isActive, stepIndex]);

  if (!isActive) return null;

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <Card className="mt-8 p-8 bg-card border-border shadow-lg animate-fade-in">
      <h2 className="text-xl font-bold text-foreground mb-6">Generating Analysis...</h2>
      <div className="space-y-4">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            {i < stepIndex ? (
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
            ) : i === stepIndex ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-muted shrink-0" />
            )}
            <span className={`text-sm ${i <= stepIndex ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {step.msg}
            </span>
          </div>
        ))}
      </div>
      <Progress value={progress} className="mt-6 h-2" />
    </Card>
  );
}
