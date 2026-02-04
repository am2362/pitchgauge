import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface AnalysisProgressBarProps {
  completed: number;
  total: number;
  currentStartup?: string;
}

export function AnalysisProgressBar({ completed, total, currentStartup }: AnalysisProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = total - completed;
  
  // Estimate: bulk analysis is intentionally throttled to avoid AI rate limits.
  // This is a rough estimate and will vary depending on cooldown/backoff.
  const estimatedSeconds = remaining * 9;
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Analysis in Progress
        </CardTitle>
        <CardDescription>
          Processing startups in batches to ensure quality analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">
              {completed} of {total} startups analyzed
            </span>
            <span className="text-muted-foreground">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        {currentStartup && (
          <p className="text-sm text-muted-foreground">
            Currently analyzing: <span className="font-medium text-foreground">{currentStartup}</span>
          </p>
        )}

        {remaining > 0 && (
          <p className="text-sm text-muted-foreground">
            Estimated time remaining: ~{estimatedMinutes} {estimatedMinutes === 1 ? 'minute' : 'minutes'}
          </p>
        )}

        <div className="text-xs text-muted-foreground">
          <p>• Keep this tab open while processing</p>
          <p>• Results are saved as they’re generated</p>
        </div>
      </CardContent>
    </Card>
  );
}
