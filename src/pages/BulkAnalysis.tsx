import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Eye, Trash2, RefreshCw, AlertTriangle, FileDown } from 'lucide-react';
import AppNavbar from '@/components/AppNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BulkUploadCard } from '@/components/bulk/BulkUploadCard';
import { AnalysisProgressBar } from '@/components/bulk/AnalysisProgressBar';
import { InvestmentRankingsTable } from '@/components/bulk/InvestmentRankingsTable';
import { SectorBreakdownChart } from '@/components/bulk/SectorBreakdownChart';
import { supabase } from '@/lib/supabase-external';
import { toast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import type { BulkAnalysis, ComparisonReport, BulkAnalysisResult } from '@/types/bulk-analysis';
import { exportBulkAnalysisToExcel } from '@/lib/bulk-excel-export';
import { exportBulkAnalysisToPDF } from '@/lib/pdf-export';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { usePageMeta } from '@/hooks/usePageMeta';

// Chunked processing constants
// Keep chunks small to avoid backend timeouts and free-tier rate limits.
// We intentionally run *very* small chunks to avoid per-request timeouts.
// Longer cooldowns happen *between* requests (frontend), not inside a single backend invocation.
const CHUNK_SIZE = 1;
const INITIAL_COOLDOWN_MS = 10000;
const MIN_COOLDOWN_MS = 8000;
const MAX_COOLDOWN_MS = 60000;

function isSuccessfulBulkResult(r: any): boolean {
  return !(r?.scores?.overall === 0 && r?.summary === "Failed to analyze this startup");
}

function splitIntoChunks<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

function createFailedBulkResult(startupName: string, errorType: string, errorMessage: string): BulkAnalysisResult {
  return {
    startupName,
    errorType,
    errorStatus: null,
    errorMessage,
    sector: 'Unknown',
    tags: [],
    metrics: {
      team: 'Analysis failed',
      product: 'Analysis failed',
      market: 'Analysis failed',
      traction: 'Analysis failed',
      funding: 'Analysis failed',
      businessModel: 'Analysis failed'
    },
    scores: {
      team: 0,
      product: 0,
      market: 0,
      traction: 0,
      funding: 0,
      businessModel: 0,
      overall: 0
    },
    summary: 'Failed to analyze this startup'
  };
}

function createLocalComparisonReport(results: BulkAnalysisResult[]): ComparisonReport {
  const sortedResults = [...results].sort((a, b) => b.scores.overall - a.scores.overall);
  const sectorBreakdown = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.sector] = (acc[result.sector] || 0) + 1;
    return acc;
  }, {});

  const topStrengths = (result: BulkAnalysisResult) => {
    const entries = [
      ['Team', result.scores.team],
      ['Product', result.scores.product],
      ['Market', result.scores.market],
      ['Traction', result.scores.traction],
      ['Funding', result.scores.funding],
      ['Business model', result.scores.businessModel],
    ].sort((a, b) => (b[1] as number) - (a[1] as number));

    return entries.slice(0, 3).map(([label, score]) => `${label}: ${score}/10`);
  };

  return {
    investmentRankings: sortedResults.slice(0, 20).map((result, index) => ({
      rank: index + 1,
      startupName: result.startupName,
      overallScore: result.scores.overall,
      topStrengths: topStrengths(result),
      recommendation: result.scores.overall >= 7 ? 'Prioritise for review' : result.scores.overall >= 5 ? 'Review if thesis-aligned' : 'Lower priority'
    })),
    overallRecommendation: `Bulk analysis complete for ${results.length} startups. Review the ranked list first, then use sector breakdowns and category scores to prioritise follow-up diligence.`,
    scoreComparison: {
      headers: ['Startup', 'Team', 'Product', 'Market', 'Traction', 'Funding', 'BizModel', 'Overall'],
      rows: sortedResults.map(result => [
        result.startupName,
        result.scores.team,
        result.scores.product,
        result.scores.market,
        result.scores.traction,
        result.scores.funding,
        result.scores.businessModel,
        result.scores.overall
      ])
    },
    strengthsAndWeaknesses: Object.fromEntries(sortedResults.map(result => [
      result.startupName,
      { strengths: topStrengths(result), weaknesses: ['Review detailed category notes before follow-up'] }
    ])),
    sectorBreakdown
  };
}

export default function BulkAnalysis() {
  usePageMeta("PitchGauge", "Batch-analyze multiple startup pitches at once with AI scoring.");
  const navigate = useNavigate();
  const { canBulkAnalyze, tier, recordUsage, startCheckout, dailyUsage, dailyLimits, dailyBulkLimitReached } = useSubscription();
  const [currentAnalysis, setCurrentAnalysis] = useState<BulkAnalysis | null>(null);
  const [history, setHistory] = useState<BulkAnalysis[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const comparisonGenerationRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isActive = true;

    const init = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!isActive) return;

      if (sessionError || !sessionData.session?.user) {
        setIsLoadingHistory(false);
        toast({
          title: 'Sign in required',
          description: 'Please sign in to view and manage your bulk analysis history.',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      await loadHistory(sessionData.session.user.id);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive) return;
      if (session?.user) {
        loadHistory(session.user.id);
      } else {
        setHistory([]);
        setCurrentAnalysis(null);
        setIsLoadingHistory(false);
        navigate('/auth');
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (currentAnalysis?.status === 'processing') {
      const interval = setInterval(() => {
        pollAnalysisStatus(currentAnalysis.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentAnalysis]);

  useEffect(() => {
    if (
      currentAnalysis?.status === 'completed' &&
      currentAnalysis.results?.some(isSuccessfulBulkResult) &&
      !currentAnalysis.comparison_report &&
      !comparisonGenerationRef.current.has(currentAnalysis.id)
    ) {
      comparisonGenerationRef.current.add(currentAnalysis.id);
      generateComparison(currentAnalysis.id);
    }
  }, [currentAnalysis]);

  const loadHistory = async (userId?: string) => {
    setIsLoadingHistory(true);
    try {
      let uid = userId;
      if (!uid) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          toast({
            title: 'Sign in required',
            description: 'Please sign in again to view your history.',
            variant: 'destructive',
          });
          navigate('/auth');
          return;
        }
        uid = userData.user.id;
      }

      const { data, error } = await supabase
        .from('bulk_analyses')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory((data as unknown as BulkAnalysis[]) || []);
    } catch (error) {
      console.error('Error loading history:', error);
      toast({
        title: 'Could not load history',
        description: 'Please refresh the page and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const pollAnalysisStatus = async (batchId: string) => {
    try {
      const { data, error } = await supabase
        .from('bulk_analyses')
        .select('*')
        .eq('id', batchId)
        .single();

      if (error) throw error;
      if (data) {
        setCurrentAnalysis(data as unknown as BulkAnalysis);
        
        if (data.status === 'completed') {
          const results = data.results as any[] || [];
          const successfulCount = results.filter(isSuccessfulBulkResult).length;
          const totalCount = results.length;
          
          if (successfulCount < totalCount) {
            toast({
              title: "Analysis Complete",
              description: `Successfully analyzed ${successfulCount} out of ${totalCount} startups. ${totalCount - successfulCount} failed due to rate limits.`,
              variant: "default"
            });
          } else {
            toast({
              title: "Analysis Complete",
              description: `Successfully analyzed ${totalCount} startups.`
            });
          }
          
          // Auto-generate comparison report only if we have at least 1 successful analysis.
          if (successfulCount > 0 && data.results && !data.comparison_report) {
            await generateComparison(batchId);
          }
          
          loadHistory();
        }
      }
    } catch (error) {
      console.error('Error polling status:', error);
    }
  };

  const handleUploadComplete = async (startups: { name: string; pitch: string }[]) => {
    if (!canBulkAnalyze) {
      toast({
        title: "Scale Feature",
        description: "Bulk analysis requires a Scale subscription. Upgrade to unlock.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to analyze startups.",
          variant: "destructive"
        });
        navigate('/auth');
        return;
      }

      // Create batch record
      const { data: batch, error: insertError } = await supabase
        .from('bulk_analyses')
        .insert({
          user_id: user.id,
          batch_name: `Batch ${new Date().toLocaleDateString()}`,
          total_startups: startups.length,
          completed_startups: 0,
          status: 'processing' as const,
          metadata: {
            pitches: Object.fromEntries(startups.map(startup => [startup.name, startup.pitch]))
          }
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const batchRecord = batch as unknown as BulkAnalysis;
      setCurrentAnalysis(batchRecord);

      // Split startups into chunks for processing
      const chunks = splitIntoChunks(startups, CHUNK_SIZE);
      let completedCount = 0;
      const allResults: BulkAnalysisResult[] = [];
      let hasError = false;
      let cooldownMs = INITIAL_COOLDOWN_MS;
      let successStreak = 0;

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        
        // Refresh session before each chunk to prevent mid-processing 401s
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please sign in again to continue.",
            variant: "destructive"
          });
          navigate('/auth');
          return;
        }
        
        try {
          // Retry transient invoke failures (often shown as "Load failed" in the browser).
          let invokeData: any | null = null;
          let lastInvokeError: any = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            const { data, error: functionError } = await supabase.functions.invoke('analyze-bulk-startups', {
              body: {
                batchId: batch.id,
                startups: chunk,
                batchSize: 1,
                appendResults: chunkIndex > 0 // Append for all chunks after the first
              }
            });

            if (!functionError && data?.results) {
              invokeData = data;
              break;
            }

            lastInvokeError = functionError;

            const delay = 2000 * (attempt + 1);
            console.warn(`Chunk ${chunkIndex + 1} invoke attempt ${attempt + 1} failed; retrying in ${delay}ms`, functionError);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          const chunkResults: BulkAnalysisResult[] = invokeData?.results
            ? (invokeData.results as BulkAnalysisResult[])
            : chunk.map((s) => createFailedBulkResult(
                s.name,
                'invoke_failed',
                lastInvokeError?.message || 'Function invoke failed'
              ));

          if (!invokeData?.results) {
            hasError = true;
            // Persist placeholders via RPC to keep payloads small.
            await supabase.rpc('append_bulk_analysis_results', {
              p_batch_id: batch.id,
              p_results: JSON.parse(JSON.stringify(chunkResults))
            });
          }

          completedCount += chunkResults.length;
          allResults.push(...chunkResults);

          // Adaptive cooldown: if we hit rate limits or failures, slow down; otherwise cautiously speed up.
          const rateLimitedCount = chunkResults.filter(r => (r as any)?.errorType === 'rate_limited').length;
          const failedCount = chunkResults.filter(r => !isSuccessfulBulkResult(r)).length;

          if (!invokeData?.results || rateLimitedCount > 0) {
            cooldownMs = Math.min(MAX_COOLDOWN_MS, Math.round(cooldownMs * 1.7) + 2000);
            successStreak = 0;
          } else if (failedCount > 0) {
            cooldownMs = Math.min(MAX_COOLDOWN_MS, Math.round(cooldownMs * 1.25) + 1000);
            successStreak = 0;
          } else {
            successStreak += 1;
            if (successStreak >= 3) {
              cooldownMs = Math.max(MIN_COOLDOWN_MS, Math.round(cooldownMs * 0.92));
            }
          }

          // Update local state for progress bar
          setCurrentAnalysis(prev => prev ? {
            ...prev,
            completed_startups: completedCount,
            results: allResults
          } : null);
        } catch (chunkError) {
          console.error(`Chunk ${chunkIndex + 1} error:`, chunkError);
          hasError = true;

          const fallbackResults = chunk.map((s) => createFailedBulkResult(
            s.name,
            'invoke_failed',
            chunkError instanceof Error ? chunkError.message : 'Unknown chunk error'
          ));

          completedCount += fallbackResults.length;
          allResults.push(...fallbackResults);

          setCurrentAnalysis(prev => prev ? {
            ...prev,
            completed_startups: completedCount,
            results: allResults
          } : null);

          cooldownMs = Math.min(MAX_COOLDOWN_MS, Math.round(cooldownMs * 1.7) + 2000);
          successStreak = 0;
        }

        // Delay between chunks (except for last chunk)
        if (chunkIndex < chunks.length - 1) {
          const jitter = Math.round(Math.random() * 800);
          await new Promise(resolve => setTimeout(resolve, cooldownMs + jitter));
        }
      }

      // === Auto-retry any failed startups ===
      // We retry persistently so that transient rate-limit failures don't bubble
      // up to the user as a "X failed" toast. Each pass waits longer than the
      // previous one to let any sustained AI rate limits fully cool down.
      const MAX_AUTO_RETRY_PASSES = 6;
      for (let retryPass = 0; retryPass < MAX_AUTO_RETRY_PASSES; retryPass++) {
        const failedIndices: number[] = [];
        allResults.forEach((r, idx) => {
          if (!isSuccessfulBulkResult(r)) failedIndices.push(idx);
        });

        if (failedIndices.length === 0) break;

        console.log(`Auto-retry pass ${retryPass + 1}/${MAX_AUTO_RETRY_PASSES}: retrying ${failedIndices.length} failed startups`);

        // Progressive backoff between passes: 20s, 35s, 50s, 65s, 80s, 95s
        const passWait = 20000 + retryPass * 15000;
        await new Promise(resolve => setTimeout(resolve, passWait));

        for (let fi = 0; fi < failedIndices.length; fi++) {
          const idx = failedIndices[fi];
          const original = startups[idx];

          // Refresh session
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) break;

          try {
            let retryData: any = null;
            for (let attempt = 0; attempt < 4; attempt++) {
              const { data, error } = await supabase.functions.invoke('analyze-bulk-startups', {
                body: {
                  batchId: batch.id,
                  startups: [original],
                  batchSize: 1,
                  appendResults: true
                }
              });
              if (!error && data?.results?.[0] && isSuccessfulBulkResult(data.results[0])) {
                retryData = data.results[0];
                break;
              }
              await new Promise(resolve => setTimeout(resolve, 4000 * (attempt + 1)));
            }

            if (retryData && isSuccessfulBulkResult(retryData)) {
              allResults[idx] = retryData;
              setCurrentAnalysis(prev => prev ? { ...prev, results: [...allResults] } : null);
            }
          } catch (e) {
            console.warn(`Auto-retry failed for startup ${idx}`, e);
          }

          // Cooldown between individual retries (grows with pass number)
          if (fi < failedIndices.length - 1) {
            const itemWait = 10000 + retryPass * 3000 + Math.round(Math.random() * 2000);
            await new Promise(resolve => setTimeout(resolve, itemWait));
          }
        }
      }

      // Final status update
      await supabase
        .from('bulk_analyses')
        .update({
          status: 'completed',
          completed_startups: allResults.length,
          results: JSON.parse(JSON.stringify(allResults)),
          comparison_report: null
        })
        .eq('id', batch.id);

      setCurrentAnalysis(prev => prev ? {
        ...prev,
        status: 'completed',
        completed_startups: allResults.length,
        results: allResults
      } : null);

      const successfulCount = allResults.filter(isSuccessfulBulkResult).length;
      const failedCount = startups.length - successfulCount;
      if (successfulCount === 0) {
        toast({
          title: "No Successful Analyses",
          description: "All startups failed. Try again in a few minutes or with fewer startups.",
          variant: "destructive"
        });
      } else if (failedCount > 0) {
        toast({
          title: "Analysis Complete",
          description: `Successfully analyzed ${successfulCount} of ${startups.length} startups. ${failedCount} still failed.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: `All ${successfulCount} startups analyzed successfully!`
        });
      }

      if (successfulCount > 0) {
        await generateComparison(batch.id);
      }

      loadHistory();

    } catch (error) {
      console.error('Error starting analysis:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const generateComparison = async (batchId: string) => {
    try {
      const { data: batch } = await supabase
        .from('bulk_analyses')
        .select('*')
        .eq('id', batchId)
        .single();

      if (!batch?.results) return;

      // Filter out failed analyses before generating comparison
      const successfulResults = (batch.results as any[]).filter(isSuccessfulBulkResult);

      if (successfulResults.length === 0) {
        toast({
          title: "No Successful Analyses",
          description: "All analyses failed. Cannot generate comparison report.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-bulk-comparison', {
        body: { results: successfulResults }
      });

      const comparisonReport = data?.comparisonReport || createLocalComparisonReport(successfulResults);
      if (error) {
        console.warn('Backend comparison failed; using deterministic local report', error);
      }

      await supabase
        .from('bulk_analyses')
        .update({ comparison_report: JSON.parse(JSON.stringify(comparisonReport)) })
        .eq('id', batchId);

      setCurrentAnalysis(prev => prev ? { ...prev, comparison_report: comparisonReport } : null);
      loadHistory();
    } catch (error) {
      console.error('Error generating comparison:', error);
      const fallbackReport = currentAnalysis?.results
        ? createLocalComparisonReport(currentAnalysis.results.filter(isSuccessfulBulkResult))
        : null;

      if (fallbackReport) {
        await supabase
          .from('bulk_analyses')
          .update({ comparison_report: JSON.parse(JSON.stringify(fallbackReport)) })
          .eq('id', batchId);
        setCurrentAnalysis(prev => prev ? { ...prev, comparison_report: fallbackReport } : null);
      }
    }
  };

  const handleRetryFailed = async () => {
    if (!currentAnalysis?.results || !currentAnalysis.id) return;
    
    const failedResults = currentAnalysis.results.filter(r => !isSuccessfulBulkResult(r));
    if (failedResults.length === 0) return;

    setIsRetrying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }

      // Fetch the original pitches from metadata or re-use names with empty pitches
      const { data: batch } = await supabase
        .from('bulk_analyses')
        .select('metadata')
        .eq('id', currentAnalysis.id)
        .single();

      const originalPitches: Record<string, string> = (batch?.metadata as any)?.pitches || {};

      const startupsToRetry = failedResults.map(r => ({
        name: r.startupName,
        pitch: originalPitches[r.startupName] || r.startupName
      }));

      const chunks = splitIntoChunks(startupsToRetry, CHUNK_SIZE);
      const retryResults: BulkAnalysisResult[] = [];
      let cooldownMs = INITIAL_COOLDOWN_MS * 1.5; // Longer cooldown for retries

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        await supabase.auth.getSession(); // refresh token

        let invokeData: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data, error } = await supabase.functions.invoke('analyze-bulk-startups', {
            body: { batchId: currentAnalysis.id, startups: chunk, batchSize: 1, appendResults: true }
          });
          if (!error && data?.results) { invokeData = data; break; }
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        }

        const chunkResults: BulkAnalysisResult[] = invokeData?.results
          ? invokeData.results
          : chunk.map(s => createFailedBulkResult(s.name, 'retry_failed', 'Retry failed'));

        retryResults.push(...chunkResults);

        if (ci < chunks.length - 1) {
          await new Promise(r => setTimeout(r, cooldownMs + Math.random() * 800));
        }
      }

      // Merge: replace failed entries with retry results
      const retryMap = new Map(retryResults.map(r => [r.startupName, r]));
      const mergedResults = currentAnalysis.results.map(r => {
        const retried = retryMap.get(r.startupName);
        return retried && isSuccessfulBulkResult(retried) ? retried : r;
      });

      // Update DB with merged results
      await supabase
        .from('bulk_analyses')
        .update({ results: JSON.parse(JSON.stringify(mergedResults)), comparison_report: null })
        .eq('id', currentAnalysis.id);

      setCurrentAnalysis(prev => prev ? { ...prev, results: mergedResults, comparison_report: null } : null);

      // Regenerate comparison
      await generateComparison(currentAnalysis.id);

      const newSuccessful = mergedResults.filter(isSuccessfulBulkResult).length;
      const stillFailed = mergedResults.length - newSuccessful;
      toast({
        title: 'Retry Complete',
        description: stillFailed > 0
          ? `${newSuccessful} of ${mergedResults.length} now successful. ${stillFailed} still failed.`
          : `All ${newSuccessful} startups analyzed successfully!`
      });

      loadHistory();
    } catch (error) {
      console.error('Retry failed:', error);
      toast({ title: 'Retry Failed', description: 'Could not retry failed analyses.', variant: 'destructive' });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleExport = async (batch: BulkAnalysis) => {
    if (!batch.results) return;
    try {
      await exportBulkAnalysisToExcel(batch.results, batch.comparison_report, batch.batch_name);
      toast({
        title: "Export Complete",
        description: "Excel file has been downloaded."
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Could not export Excel file",
        variant: "destructive"
      });
    }
  };

  const handleExportPDF = (batch: BulkAnalysis) => {
    if (!batch.results) return;
    try {
      exportBulkAnalysisToPDF(batch.results, batch.comparison_report, batch.batch_name);
      toast({
        title: "PDF Exported",
        description: "PDF report has been downloaded."
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Could not export PDF",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (batchId: string) => {
    try {
      const { error } = await supabase
        .from('bulk_analyses')
        .delete()
        .eq('id', batchId);

      if (error) throw error;

      toast({
        title: "Batch Deleted",
        description: "Analysis batch has been removed."
      });

      if (currentAnalysis?.id === batchId) {
        setCurrentAnalysis(null);
      }
      loadHistory();
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast({
        title: "Delete Failed",
        description: "Could not delete the batch",
        variant: "destructive"
      });
    }
  };

  const handleView = async (batchId: string) => {
    const { data } = await supabase
      .from('bulk_analyses')
      .select('*')
      .eq('id', batchId)
      .single();

    if (data) {
      setCurrentAnalysis(data as unknown as BulkAnalysis);
      if (data.status === 'completed' && data.results && !data.comparison_report) {
        const successfulCount = (data.results as any[]).filter(isSuccessfulBulkResult).length;
        if (successfulCount > 0) {
          await generateComparison(batchId);
        }
      }
    }
  };

  if (!canBulkAnalyze) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <div className="container mx-auto p-6 space-y-6">
          <h1 className="text-3xl font-bold">Bulk Startup Analysis</h1>
          <UpgradePrompt
            requiredTier="scale"
            currentTier={tier}
            featureName="Bulk Analysis"
            onUpgrade={(t) => startCheckout(t)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Bulk Startup Analysis</h1>
          <p className="text-muted-foreground">Analyze up to 100 startup pitches at once</p>
          <p className="text-sm text-muted-foreground mt-1">
            {dailyBulkLimitReached
              ? "Daily limit reached. Resets at midnight UTC."
              : `${Math.max(0, dailyLimits.bulk_analysis - dailyUsage.bulk_analysis)} of ${dailyLimits.bulk_analysis} bulk jobs remaining today`}
          </p>
        </div>

        {!currentAnalysis && <BulkUploadCard onUploadComplete={handleUploadComplete} />}

        {currentAnalysis?.status === 'processing' && (
          <AnalysisProgressBar
            completed={currentAnalysis.completed_startups}
            total={currentAnalysis.total_startups}
          />
        )}

        {currentAnalysis?.status === 'completed' && currentAnalysis.results && (() => {
          const failedResults = currentAnalysis.results.filter(r => !isSuccessfulBulkResult(r));
          const successfulCount = currentAnalysis.results.length - failedResults.length;
          return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Analysis Results</h2>
              <div className="flex gap-2">
                {failedResults.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => handleRetryFailed()}
                    disabled={isRetrying}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
                    Retry {failedResults.length} Failed
                  </Button>
                )}
                <Button onClick={() => handleExport(currentAnalysis)} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export to Excel
                </Button>
                <Button onClick={() => handleExportPDF(currentAnalysis)} variant="outline" className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={() => setCurrentAnalysis(null)}>
                  New Analysis
                </Button>
              </div>
            </div>

            {failedResults.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{failedResults.length} startup{failedResults.length > 1 ? 's' : ''} failed analysis</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">
                    {successfulCount} of {currentAnalysis.results.length} startups were analyzed successfully.
                    Failed startups are usually caused by AI rate limits. Click "Retry Failed" to re-analyze them.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {failedResults.map(r => (
                      <span key={r.startupName} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-destructive/10 text-destructive">
                        {r.startupName}
                      </span>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {currentAnalysis.comparison_report && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Recommendation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {currentAnalysis.comparison_report.overallRecommendation}
                    </p>
                  </CardContent>
                </Card>

                <InvestmentRankingsTable rankings={currentAnalysis.comparison_report.investmentRankings} />
                <SectorBreakdownChart sectorBreakdown={currentAnalysis.comparison_report.sectorBreakdown} />
              </>
            )}

            {!currentAnalysis.comparison_report && successfulCount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Preparing Comparison Report</CardTitle>
                  <CardDescription>
                    {successfulCount} successful analyses are available. The comparison report is being generated.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {!currentAnalysis.comparison_report && successfulCount === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Comparison Report Unavailable</CardTitle>
                  <CardDescription>
                    No successful analyses were produced, so we can’t generate a comparison report.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    This is usually caused by AI rate limits/timeouts during high-volume runs. Try again in a few minutes or run a smaller batch.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          );
        })()}

        <Card>
          <CardHeader>
            <CardTitle>Analysis History</CardTitle>
            <CardDescription>View and manage previous bulk analyses</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <p className="text-center text-muted-foreground py-8">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No previous analyses</p>
            ) : (
              <div className="space-y-2">
                {history.map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{batch.batch_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {batch.total_startups} startups • {new Date(batch.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {batch.status === 'completed' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleView(batch.id)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExport(batch)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(batch.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
