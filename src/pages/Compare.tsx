import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-external";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { User } from "@supabase/supabase-js";
import { Loader2, TrendingUp, Plus, X, FileDown, Save, History, Upload, Download, Edit, Trophy, ThumbsUp, ThumbsDown } from "lucide-react";
import AppNavbar from "@/components/AppNavbar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { exportComparisonToPDF } from "@/lib/pdf-export";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseExcelFile, createExcelTemplate, ParsedStartupData } from "@/lib/excel-parser";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useCountUp } from "@/hooks/useCountUp";
import { ComparisonSkeleton } from "@/components/AnalysisSkeletons";

interface ScoreItem {
  score: number;
  reasoning: string;
  detailedExplanation?: string;
}

interface Scorecard {
  team: ScoreItem;
  marketSize: ScoreItem;
  traction: ScoreItem;
  productDifferentiation: ScoreItem;
  businessModel: ScoreItem;
  competitiveLandscape: ScoreItem;
}

interface AnalysisResult {
  startupName?: string;
  memo: string;
  scorecard: Scorecard;
  redFlags?: Array<{ severity: string; issue: string; explanation: string }>;
  followUpQuestions?: Record<string, string[]>;
  investmentThesis?: { bullCase: string; bearCase: string };
  benchmarking?: { overallPercentile: string; stageContext: string; comparisonNotes: string };
}

interface PitchSlot {
  id: number;
  name: string;
  text: string;
  analysis: AnalysisResult | null;
  loading: boolean;
}

interface RecentComparison {
  id: string;
  created_at: string;
  startup_names: string[];
  pitches: string[];
  analyses: AnalysisResult[];
  comparison_insights: any;
}

export default function Compare() {
  usePageMeta("PitchGauge", "Compare multiple startup pitches side-by-side with AI analysis.");
  const [user, setUser] = useState<User | null>(null);
  const [pitches, setPitches] = useState<PitchSlot[]>([
    { id: 1, name: "Startup A", text: "", analysis: null, loading: false },
    { id: 2, name: "Startup B", text: "", analysis: null, loading: false },
  ]);
  const [comparisonInsights, setComparisonInsights] = useState<any>(null);
  const [isGeneratingComparison, setIsGeneratingComparison] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [excelPreviewData, setExcelPreviewData] = useState<ParsedStartupData[]>([]);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [editingNameId, setEditingNameId] = useState<number | null>(null);
  const [tempName, setTempName] = useState("");
  const [recentComparisons, setRecentComparisons] = useState<RecentComparison[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canCompare, tier, recordUsage, startCheckout } = useSubscription();

  const loadRecentComparisons = async () => {
    if (!user) return;
    
    setIsLoadingRecent(true);
    try {
      const { data, error } = await supabase
        .from("comparison_analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
        
      if (!error && data) {
        setRecentComparisons(data as unknown as RecentComparison[]);
      }
    } catch (error) {
      console.error("Failed to load recent comparisons:", error);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const loadHistoricalComparison = (comparison: RecentComparison) => {
    const restoredPitches: PitchSlot[] = comparison.startup_names.map((name, index) => ({
      id: index + 1,
      name: name,
      text: comparison.pitches[index] || "",
      analysis: comparison.analyses[index] || null,
      loading: false,
    }));
    
    setPitches(restoredPitches);
    setComparisonInsights(comparison.comparison_insights);
    
    toast({
      title: "Comparison Loaded",
      description: `Loaded comparison from ${new Date(comparison.created_at).toLocaleDateString()}`,
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadRecentComparisons();
    }
  }, [user]);

  const addPitch = () => {
    if (pitches.length >= 10) {
      toast({ title: "Maximum 10 startups allowed", description: "You've reached the comparison limit.", variant: "destructive" });
      return;
    }
    setPitches([...pitches, {
      id: pitches.length + 1,
      name: `Startup ${String.fromCharCode(65 + pitches.length)}`,
      text: "",
      analysis: null,
      loading: false
    }]);
  };

  const removePitch = (id: number) => {
    if (pitches.length > 2) {
      setPitches(pitches.filter(p => p.id !== id));
    }
  };

  // Sanitize text by stripping HTML tags
  const sanitizeText = (text: string): string => {
    return text.replace(/<[^>]*>?/gm, '');
  };

  const updatePitchText = (id: number, text: string) => {
    // Enforce 10,000 character limit
    const limitedText = text.length > 10000 ? text.slice(0, 10000) : text;
    setPitches(currentPitches => currentPitches.map(p => p.id === id ? { ...p, text: limitedText } : p));
  };

  const updatePitchName = (id: number, newName: string) => {
    if (newName.trim()) {
      setPitches(currentPitches => 
        currentPitches.map(p => p.id === id ? { ...p, name: newName.trim() } : p)
      );
      toast({
        title: "Name Updated",
        description: "Startup name has been changed",
      });
    }
  };

  const renderEditableName = (pitch: PitchSlot) => {
    if (editingNameId === pitch.id) {
      return (
        <Input
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onBlur={() => {
            updatePitchName(pitch.id, tempName);
            setEditingNameId(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updatePitchName(pitch.id, tempName);
              setEditingNameId(null);
            }
            if (e.key === 'Escape') {
              setEditingNameId(null);
            }
          }}
          className="w-full text-center inline-block max-w-[200px]"
          autoFocus
        />
      );
    }
    
    return (
      <span 
        className="cursor-pointer hover:bg-secondary/30 transition-colors rounded px-2 py-1 inline-flex items-center gap-1 border border-transparent hover:border-secondary text-xl font-bold"
        onClick={() => {
          setEditingNameId(pitch.id);
          setTempName(pitch.name);
        }}
        title="Click to edit name"
      >
        {pitch.name}
        <Edit className="h-3 w-3 opacity-70 hover:opacity-100" />
      </span>
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingExcel(true);

    try {
      const result = await parseExcelFile(file);

      // Show errors
      if (result.errors.length > 0) {
        toast({
          title: "Error parsing Excel file",
          description: result.errors.join(". "),
          variant: "destructive",
        });
        setIsProcessingExcel(false);
        return;
      }

      // Show warnings
      if (result.warnings.length > 0) {
        toast({
          title: "Import Warnings",
          description: result.warnings.join(". "),
        });
      }

      // Show preview dialog
      setExcelPreviewData(result.data);
      setShowExcelPreview(true);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process Excel file",
        variant: "destructive",
      });
    } finally {
      setIsProcessingExcel(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImportStartups = (replaceAll: boolean) => {
    if (replaceAll) {
      // Replace all pitches
      setPitches(excelPreviewData.map((data, index) => ({
        id: index + 1,
        name: data.name,
        text: data.pitch,
        analysis: null,
        loading: false
      })));
    } else {
      // Add to existing
      const newPitches = excelPreviewData.map((data, index) => ({
        id: pitches.length + index + 1,
        name: data.name,
        text: data.pitch,
        analysis: null,
        loading: false
      }));
      setPitches([...pitches, ...newPitches]);
    }

    setShowExcelPreview(false);
    setExcelPreviewData([]);

    toast({
      title: "Success",
      description: `${excelPreviewData.length} startup${excelPreviewData.length > 1 ? 's' : ''} imported successfully`,
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      await createExcelTemplate();
      toast({
        title: "Template Downloaded",
        description: "Excel template downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Could not generate the template",
        variant: "destructive",
      });
    }
  };

  const analyzePitch = async (id: number) => {
    if (!canCompare) {
      toast({
        title: "Pro Feature",
        description: "Comparison mode requires a Pro or Scale subscription. Upgrade to unlock.",
        variant: "destructive",
      });
      return;
    }

    const pitch = pitches.find(p => p.id === id);
    if (!pitch || !pitch.text.trim()) {
      toast({
        title: "Error",
        description: "Please enter pitch text",
        variant: "destructive",
      });
      return;
    }

    setPitches(currentPitches => currentPitches.map(p => p.id === id ? { ...p, loading: true } : p));

    try {
      // Sanitize and limit text before sending
      const sanitizedText = sanitizeText(pitch.text).slice(0, 10000);
      
      const { data, error } = await supabase.functions.invoke("analyze-startup", {
        body: { text: sanitizedText },
      });

      if (error) throw error;

      setPitches(currentPitches => currentPitches.map(p => p.id === id ? { ...p, analysis: data, loading: false } : p));

      toast({
        title: "Analysis Complete",
        description: `${pitch.name} analysis ready`,
      });
    } catch (error: any) {
      setPitches(currentPitches => currentPitches.map(p => p.id === id ? { ...p, loading: false } : p));
      toast({
        title: "Analysis Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const analyzeAll = async () => {
    // Re-analyze ALL pitches that have text, regardless of existing analysis
    const toAnalyze = pitches.filter(p => p.text.trim());
    
    if (toAnalyze.length === 0) {
      toast({
        title: "No Pitches to Analyze",
        description: "Please add pitch text before analyzing",
        variant: "destructive",
      });
      return;
    }

    // Clear existing analyses first
    setPitches(currentPitches => currentPitches.map(p => 
      p.text.trim() ? { ...p, analysis: null } : p
    ));

    toast({
      title: "Re-analyzing All Pitches",
      description: `Analyzing ${toAnalyze.length} startup${toAnalyze.length !== 1 ? 's' : ''}...`,
    });

    // Analyze each pitch sequentially
    for (let i = 0; i < toAnalyze.length; i++) {
      const pitch = toAnalyze[i];
      await analyzePitch(pitch.id);
    }

    // Wait for state to settle
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check how many are now analyzed and trigger comparison
    setPitches(currentPitches => {
      const analyzed = currentPitches.filter(p => p.analysis);
      if (analyzed.length >= 2) {
        setTimeout(() => generateComparisonInsights(), 100);
      }
      return currentPitches;
    });
  };

  const generateComparisonInsights = async () => {
    const analyzed = pitches.filter(p => p.analysis);
    if (analyzed.length < 2) return;

    setIsGeneratingComparison(true);
    try {
      const { data, error } = await supabase.functions.invoke("compare-startups", {
        body: {
          analyses: analyzed.map(p => p.analysis),
          startupNames: analyzed.map(p => p.name),
        },
      });

      if (error) throw error;

      // Recalculate rankings on frontend from actual scores for consistency
      const scoreKeys: Array<keyof Scorecard> = ['team', 'marketSize', 'traction', 'productDifferentiation', 'businessModel', 'competitiveLandscape'];
      const calculatedRankings = analyzed.map(p => {
        const avg = scoreKeys.reduce((sum, k) => sum + p.analysis!.scorecard[k].score, 0) / scoreKeys.length;
        return { startupName: p.name, overallScore: Math.round(avg * 10) / 10 };
      });
      calculatedRankings.sort((a, b) => b.overallScore - a.overallScore);
      const rankedData = {
        ...data,
        rankings: calculatedRankings.map((r, idx) => ({
          ...r,
          rank: idx + 1,
          reasoning: data.comparativeInsights?.strengths?.[r.startupName] || data.rankings?.find((dr: any) => dr.startupName === r.startupName)?.reasoning || '',
        })),
      };

      setComparisonInsights(rankedData);
      setShowComparisonDialog(true);
      await recordUsage('comparison');
      toast({
        title: "Comparison Complete",
        description: "View full results in the dialog",
      });

      // Auto-save after successful comparison generation
      const analyzed2 = pitches.filter(p => p.analysis);
      if (analyzed2.length >= 2 && user) {
        try {
          const comparisonData: any = {
            user_id: user.id,
            startup_names: analyzed2.map(p => p.name),
            pitches: analyzed2.map(p => p.text),
            analyses: analyzed2.map(p => p.analysis),
            comparison_insights: data,
          };
          await supabase.from("comparison_analyses").insert([comparisonData]);
          loadRecentComparisons();
        } catch (saveErr) {
          // Silent fail for auto-save
          console.error("Auto-save comparison failed:", saveErr);
        }
      }
    } catch (error: any) {
      toast({
        title: "Comparison Failed",
        description: error.message || "Could not generate comparison",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingComparison(false);
    }
  };

  const saveComparison = async () => {
    const analyzed = pitches.filter(p => p.analysis);
    if (analyzed.length < 2 || !user) return;

    setIsSaving(true);
    try {
      const comparisonData: any = {
        user_id: user.id,
        startup_names: analyzed.map(p => p.name),
        pitches: analyzed.map(p => p.text),
        analyses: analyzed.map(p => p.analysis),
        comparison_insights: comparisonInsights,
      };

      const { error } = await supabase.from("comparison_analyses").insert([comparisonData]);

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Comparison saved to your history",
      });

      // Refresh recent comparisons list
      loadRecentComparisons();
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = () => {
    const analyzed = pitches.filter(p => p.analysis);
    if (analyzed.length < 2) return;

    exportComparisonToPDF({
      startupNames: analyzed.map(p => p.name),
      analyses: analyzed.map(p => p.analysis!),
      comparisonInsights,
    });

    toast({
      title: "PDF Exported",
      description: "Comparison report downloaded",
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-blue-500";
    if (score >= 4) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 8) return "bg-green-500";
    if (score >= 6) return "bg-blue-500";
    return "bg-orange-500";
  };

  const scorecardLabels: Record<string, string> = {
    team: "Team", marketSize: "Market", productDifferentiation: "Product",
    traction: "Traction", businessModel: "Business Model", competitiveLandscape: "Competition",
  };

  const getOverallScore = (analysis: AnalysisResult) => {
    const keys = scorecardKeys as Array<keyof Scorecard>;
    return keys.reduce((sum, k) => sum + analysis.scorecard[k].score, 0) / keys.length;
  };

  const renderScoreBreakdownAccordion = (analyzedPitches: PitchSlot[]) => (
    <Accordion type="multiple" className="space-y-3">
      {analyzedPitches.map((pitch) => (
        <AccordionItem key={pitch.id} value={pitch.name} className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <span className="font-bold text-foreground">{pitch.name}</span>
              <Badge variant="outline" className="text-xs">
                {getOverallScore(pitch.analysis!) > 7 ? "Strong" : "Moderate"}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              {scorecardKeys.map((key) => {
                const entry = pitch.analysis!.scorecard[key];
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{scorecardLabels[key]}</span>
                      <span className={`text-sm font-bold ${getScoreColor(entry.score)}`}>{entry.score}/10</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreBarColor(entry.score)}`}
                        style={{ width: `${entry.score * 10}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.reasoning}</p>
                    {entry.detailedExplanation && (
                      <p className="text-xs text-muted-foreground/70 italic">{entry.detailedExplanation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );

  const scorecardKeys: Array<keyof Scorecard> = ['team', 'marketSize', 'traction', 'productDifferentiation', 'businessModel', 'competitiveLandscape'];

  const getComparison = () => {
    const analyzed = pitches.filter(p => p.analysis);
    if (analyzed.length < 2) return null;

    const comparisons: string[] = [];
    
    scorecardKeys.forEach(key => {
      const scores = analyzed.map(p => ({
        name: p.name,
        score: p.analysis!.scorecard[key].score
      }));
      const max = Math.max(...scores.map(s => s.score));
      const winner = scores.find(s => s.score === max);
      if (winner && scores.some(s => s.score !== max)) {
        comparisons.push(`${winner.name} has stronger ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} (${max}/10)`);
      }
    });

    return comparisons;
  };

  if (!user) return null;

  if (!canCompare) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
        <AppNavbar />
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Compare Startups</h1>
          <UpgradePrompt
            requiredTier="pro"
            currentTier={tier}
            featureName="Comparison Mode"
            onUpgrade={(t) => startCheckout(t)}
          />
        </div>
      </div>
    );
  }

  const allAnalyzed = pitches.every(p => p.analysis || !p.text.trim());
  const comparisons = getComparison();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <AppNavbar />
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Compare Startups</h1>
          <div className="flex gap-2">
            <Button onClick={handleDownloadTemplate} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline"
              disabled={isProcessingExcel}
            >
              {isProcessingExcel ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" />Upload Excel</>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
               accept=".xlsx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button onClick={addPitch} variant="outline" disabled={pitches.length >= 10}>
              <Plus className="h-4 w-4 mr-2" />
              Add Startup ({pitches.length}/10)
            </Button>
            {allAnalyzed && pitches.some(p => p.analysis) && (
              <>
                <Button onClick={saveComparison} disabled={isSaving} variant="outline">
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
                <Button onClick={handleExportPDF} variant="outline">
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </>
            )}
            <Button onClick={analyzeAll} disabled={pitches.some(p => p.loading) || isGeneratingComparison}>
              {pitches.some(p => p.loading) || isGeneratingComparison ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
              ) : (
                "Analyze All"
              )}
            </Button>
          </div>
        </div>

        {comparisonInsights && (
          <div className="space-y-6 mb-6 animate-fade-in">
            {/* Rankings */}
            {comparisonInsights.rankings && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" /> Investment Rankings
                </h2>
                <div className="space-y-3">
                  {comparisonInsights.rankings.map((ranking: any) => {
                    const pitch = pitches.find(p => p.name === ranking.startupName);
                    const avg = pitch?.analysis ? getOverallScore(pitch.analysis) : null;
                    return (
                      <div key={ranking.startupName} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                        <span className="text-2xl font-extrabold text-primary w-8">#{ranking.rank}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{ranking.startupName}</p>
                          <p className="text-xs text-muted-foreground">{ranking.reasoning}</p>
                        </div>
                        {avg !== null && (
                          <span className={`text-xl font-bold ${getScoreColor(Math.round(avg))}`}>{avg.toFixed(1)}/10</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Detailed Score Breakdown */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 text-foreground">Detailed Score Breakdown</h2>
              {renderScoreBreakdownAccordion(pitches.filter(p => p.analysis))}
            </Card>

            {/* Strengths & Weaknesses per startup */}
            {comparisonInsights?.comparativeInsights?.strengths && (
              <div className="grid md:grid-cols-{Math.min(pitches.filter(p => p.analysis).length, 3)} gap-4">
                {pitches.filter(p => p.analysis).map(pitch => {
                  const strengths = comparisonInsights.comparativeInsights.strengths[pitch.name];
                  const weaknesses = comparisonInsights.comparativeInsights.weaknesses[pitch.name];
                  if (!strengths && !weaknesses) return null;
                  return (
                    <Card key={pitch.id} className="p-5">
                      <h3 className="font-bold text-foreground mb-3">{pitch.name}</h3>
                      <div className="space-y-3">
                        {strengths && (
                          <div>
                            <p className="text-xs font-semibold text-green-600 flex items-center gap-1 mb-1">
                              <ThumbsUp className="h-3 w-3" /> Strengths
                            </p>
                            <p className="text-xs text-muted-foreground">{typeof strengths === 'string' ? strengths : Array.isArray(strengths) ? strengths.map((s: string, i: number) => <span key={i} className="block">• {s}</span>) : null}</p>
                          </div>
                        )}
                        {weaknesses && (
                          <div>
                            <p className="text-xs font-semibold text-red-500 flex items-center gap-1 mb-1">
                              <ThumbsDown className="h-3 w-3" /> Weaknesses
                            </p>
                            <p className="text-xs text-muted-foreground">{typeof weaknesses === 'string' ? weaknesses : Array.isArray(weaknesses) ? weaknesses.map((w: string, i: number) => <span key={i} className="block">• {w}</span>) : null}</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Overall Recommendation */}
            {comparisonInsights.investmentRecommendation && (
              <Card className="p-6 border-primary/30 bg-primary/5">
                <h2 className="text-xl font-bold mb-3 text-foreground">Overall Recommendation</h2>
                <p className="text-muted-foreground leading-relaxed">{comparisonInsights.investmentRecommendation}</p>
              </Card>
            )}

            {comparisonInsights.comparativeInsights?.relativePerspective && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-3 text-foreground">Overall Perspective</h2>
                <p className="text-muted-foreground leading-relaxed">{comparisonInsights.comparativeInsights.relativePerspective}</p>
              </Card>
            )}

            {/* Action buttons */}
            <div className="flex justify-center gap-3">
              <Button onClick={() => setShowComparisonDialog(true)} size="lg">
                <TrendingUp className="h-5 w-5 mr-2" />
                View Full Comparison Results
              </Button>
            </div>
          </div>
        )}
        
        {comparisons && comparisons.length > 0 && !comparisonInsights && (
          <Card className="p-6 mb-6 bg-accent/10 border-accent">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Insights
            </h3>
            <ul className="space-y-2">
              {comparisons.map((comp, idx) => (
                <li key={idx} className="text-sm text-muted-foreground">• {comp}</li>
              ))}
            </ul>
            <Button 
              onClick={generateComparisonInsights} 
              disabled={isGeneratingComparison}
              className="mt-4"
              size="sm"
            >
              {isGeneratingComparison ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating AI Analysis...</>
              ) : (
                "Generate AI Comparison"
              )}
            </Button>
          </Card>
        )}

        <div className="grid gap-6 mb-6">
          {pitches.map((pitch) => (
        <Card key={pitch.id} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {renderEditableName(pitch)}
            </div>
            {pitches.length > 2 && (
              <Button variant="ghost" size="icon" onClick={() => removePitch(pitch.id)}>
                <X className="h-4 w-4" />
              </Button>
            )}
              </div>
              <Textarea
                value={pitch.text}
                onChange={(e) => updatePitchText(pitch.id, e.target.value)}
                placeholder="Paste startup pitch here..."
                className="min-h-[150px] mb-4"
                disabled={pitch.loading || !!pitch.analysis}
              />
            </Card>
          ))}
        </div>

        {allAnalyzed && pitches.some(p => p.analysis) && !comparisonInsights && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Score Breakdown</h2>
            {renderScoreBreakdownAccordion(pitches.filter(p => p.analysis))}
          </Card>
        )}

        {/* Recent Comparisons Section */}
        <Card className="p-8 bg-card border-border shadow-lg mt-6">
          <div className="flex items-center gap-3 mb-6">
            <History className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Recent Comparisons</h2>
          </div>

          {isLoadingRecent ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentComparisons.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No saved comparisons yet. Analyze startups and save to see them here!
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {recentComparisons.map((comparison) => (
                <Card
                  key={comparison.id}
                  className="p-4 cursor-pointer hover:bg-secondary/50 transition-all border-border"
                  onClick={() => loadHistoricalComparison(comparison)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-wrap gap-2">
                      {comparison.startup_names.map((name, idx) => (
                        <Badge key={idx} variant="secondary">{name}</Badge>
                      ))}
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0">
                      {new Date(comparison.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click to load comparison
                  </p>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* Comparison Results Dialog */}
        <Dialog open={showComparisonDialog} onOpenChange={setShowComparisonDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                Startup Comparison Results
              </DialogTitle>
              <DialogDescription>
                AI-powered comparative analysis of {pitches.filter(p => p.analysis).length} startups
              </DialogDescription>
              <p className="text-sm text-muted-foreground mt-2">
                💡 Tip: Click any startup name to edit it
              </p>
            </DialogHeader>

            <div className="space-y-6">
              {/* Rankings */}
              {comparisonInsights?.rankings && (
                <div>
                  <h2 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" /> Investment Rankings
                  </h2>
                  <div className="space-y-3">
                    {comparisonInsights.rankings.map((ranking: any) => {
                      const pitch = pitches.find(p => p.name === ranking.startupName);
                      const avg = pitch?.analysis ? getOverallScore(pitch.analysis) : null;
                      return (
                        <div key={ranking.startupName} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                          <span className="text-2xl font-extrabold text-primary w-8">#{ranking.rank}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{ranking.startupName}</p>
                            <p className="text-xs text-muted-foreground">{ranking.reasoning}</p>
                          </div>
                          {avg !== null && (
                            <span className={`text-xl font-bold ${getScoreColor(Math.round(avg))}`}>{avg.toFixed(1)}/10</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Detailed Score Breakdown */}
              <div>
                <h2 className="text-xl font-bold mb-4 text-foreground">Detailed Score Breakdown</h2>
                {renderScoreBreakdownAccordion(pitches.filter(p => p.analysis))}
              </div>

              {/* Per-startup Strengths & Weaknesses */}
              {comparisonInsights?.comparativeInsights?.strengths && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pitches.filter(p => p.analysis).map(pitch => {
                    const strengths = comparisonInsights.comparativeInsights.strengths[pitch.name];
                    const weaknesses = comparisonInsights.comparativeInsights.weaknesses?.[pitch.name];
                    if (!strengths && !weaknesses) return null;
                    return (
                      <Card key={pitch.id} className="p-5">
                        <h3 className="font-bold text-foreground mb-3">{pitch.name}</h3>
                        <div className="space-y-3">
                          {strengths && (
                            <div>
                              <p className="text-xs font-semibold text-green-600 flex items-center gap-1 mb-1">
                                <ThumbsUp className="h-3 w-3" /> Strengths
                              </p>
                              <p className="text-xs text-muted-foreground">{typeof strengths === 'string' ? strengths : Array.isArray(strengths) ? strengths.map((s: string, i: number) => <span key={i} className="block">• {s}</span>) : null}</p>
                            </div>
                          )}
                          {weaknesses && (
                            <div>
                              <p className="text-xs font-semibold text-red-500 flex items-center gap-1 mb-1">
                                <ThumbsDown className="h-3 w-3" /> Weaknesses
                              </p>
                              <p className="text-xs text-muted-foreground">{typeof weaknesses === 'string' ? weaknesses : Array.isArray(weaknesses) ? weaknesses.map((w: string, i: number) => <span key={i} className="block">• {w}</span>) : null}</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Overall Recommendation */}
              {comparisonInsights?.investmentRecommendation && (
                <Card className="p-6 border-primary/30 bg-primary/5">
                  <h2 className="text-xl font-bold mb-3 text-foreground">Overall Recommendation</h2>
                  <p className="text-muted-foreground leading-relaxed">{comparisonInsights.investmentRecommendation}</p>
                </Card>
              )}

              {comparisonInsights?.comparativeInsights?.relativePerspective && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-3 text-foreground">Overall Perspective</h2>
                  <p className="text-muted-foreground leading-relaxed">{comparisonInsights.comparativeInsights.relativePerspective}</p>
                </Card>
              )}
            </div>

            <DialogFooter className="flex gap-2 mt-6">
              <Button onClick={handleExportPDF} variant="outline">
                <FileDown className="h-4 w-4 mr-2" />
                Export as PDF
              </Button>
              <Button onClick={saveComparison} disabled={isSaving}>
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />Save to History</>
                )}
              </Button>
              <Button onClick={() => setShowComparisonDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Excel Preview Dialog */}
        <Dialog open={showExcelPreview} onOpenChange={setShowExcelPreview}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview Excel Import</DialogTitle>
              <DialogDescription>
                Found {excelPreviewData.length} startup{excelPreviewData.length !== 1 ? 's' : ''}. Review and confirm import.
              </DialogDescription>
            </DialogHeader>
            
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Startup Name</TableHead>
                    <TableHead>Pitch Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {excelPreviewData.map((data, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{data.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {data.pitch.length > 150 
                          ? `${data.pitch.substring(0, 150)}...` 
                          : data.pitch}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowExcelPreview(false);
                  setExcelPreviewData([]);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => handleImportStartups(false)}
              >
                Add to Existing
              </Button>
              <Button onClick={() => handleImportStartups(true)}>
                Replace All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
