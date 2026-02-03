import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BulkUploadCard } from '@/components/bulk/BulkUploadCard';
import { AnalysisProgressBar } from '@/components/bulk/AnalysisProgressBar';
import { InvestmentRankingsTable } from '@/components/bulk/InvestmentRankingsTable';
import { SectorBreakdownChart } from '@/components/bulk/SectorBreakdownChart';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { BulkAnalysis, ComparisonReport, BulkAnalysisResult } from '@/types/bulk-analysis';
import { exportBulkAnalysisToExcel } from '@/lib/bulk-excel-export';

// Chunked processing constants
// Keep chunks small to avoid backend timeouts and free-tier rate limits.
const CHUNK_SIZE = 8;
const DELAY_BETWEEN_CHUNKS = 8000;

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

export default function BulkAnalysis() {
  const navigate = useNavigate();
  const [currentAnalysis, setCurrentAnalysis] = useState<BulkAnalysis | null>(null);
  const [history, setHistory] = useState<BulkAnalysis[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (currentAnalysis?.status === 'processing') {
      const interval = setInterval(() => {
        pollAnalysisStatus(currentAnalysis.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentAnalysis]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('bulk_analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory((data as unknown as BulkAnalysis[]) || []);
    } catch (error) {
      console.error('Error loading history:', error);
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
          status: 'processing' as const
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

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        
        try {
          // Retry transient invoke failures (often shown as "Load failed" in the browser).
          let invokeData: any | null = null;
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

            const delay = 2000 * (attempt + 1);
            console.warn(`Chunk ${chunkIndex + 1} invoke attempt ${attempt + 1} failed; retrying in ${delay}ms`, functionError);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          if (!invokeData?.results) {
            hasError = true;
            continue;
          }

          if (invokeData?.results) {
            completedCount += invokeData.results.length;
            allResults.push(...invokeData.results);

            // Update local state for progress bar
            setCurrentAnalysis(prev => prev ? {
              ...prev,
              completed_startups: completedCount,
              results: allResults
            } : null);
          }
        } catch (chunkError) {
          console.error(`Chunk ${chunkIndex + 1} error:`, chunkError);
          hasError = true;
          continue; // Continue with next chunk
        }

        // Delay between chunks (except for last chunk)
        if (chunkIndex < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
        }
      }

      // Final status update
      await supabase
        .from('bulk_analyses')
        .update({
          status: 'completed',
          completed_startups: allResults.length,
          results: allResults as unknown as any
        })
        .eq('id', batch.id);

      // Update local state to completed
      setCurrentAnalysis(prev => prev ? {
        ...prev,
        status: 'completed',
        completed_startups: allResults.length,
        results: allResults
      } : null);

      // Show completion toast
      const successfulCount = allResults.filter(isSuccessfulBulkResult).length;
      const failedCount = startups.length - successfulCount;
      if (successfulCount === 0) {
        toast({
          title: "No Successful Analyses",
          description: "All startups failed to analyze (usually due to rate limits/timeouts). Try again in a few minutes or with fewer startups per run.",
          variant: "destructive"
        });
      } else if (hasError || failedCount > 0) {
        toast({
          title: "Analysis Complete",
          description: `Successfully analyzed ${successfulCount} of ${startups.length} startups. ${failedCount} failed (likely rate limits).`,
          variant: "default"
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: `Successfully analyzed ${successfulCount} startups.`
        });
      }

      // Generate comparison report
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

      if (error) throw error;

      if (data?.comparisonReport) {
        await supabase
          .from('bulk_analyses')
          .update({ comparison_report: data.comparisonReport })
          .eq('id', batchId);

        setCurrentAnalysis(prev => prev ? { ...prev, comparison_report: data.comparisonReport } : null);
        loadHistory();
      }
    } catch (error) {
      console.error('Error generating comparison:', error);
      toast({
        title: "Comparison Failed",
        description: "Could not generate comparison report",
        variant: "destructive"
      });
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Bulk Startup Analysis</h1>
            <p className="text-muted-foreground">Analyze up to 1000 startup pitches at once</p>
          </div>
        </div>

        {!currentAnalysis && <BulkUploadCard onUploadComplete={handleUploadComplete} />}

        {currentAnalysis?.status === 'processing' && (
          <AnalysisProgressBar
            completed={currentAnalysis.completed_startups}
            total={currentAnalysis.total_startups}
          />
        )}

        {currentAnalysis?.status === 'completed' && currentAnalysis.results && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Analysis Results</h2>
              <div className="flex gap-2">
                <Button onClick={() => handleExport(currentAnalysis)} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export to Excel
                </Button>
                <Button variant="outline" onClick={() => setCurrentAnalysis(null)}>
                  New Analysis
                </Button>
              </div>
            </div>

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

            {!currentAnalysis.comparison_report && (
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
        )}

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
