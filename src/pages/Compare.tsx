import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { ArrowLeft, Loader2, TrendingUp, Plus, X, FileDown, Save, History, Upload, Download, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { exportComparisonToPDF } from "@/lib/pdf-export";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseExcelFile, createExcelTemplate, ParsedStartupData } from "@/lib/excel-parser";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

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

export default function Compare() {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const addPitch = () => {
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

  const updatePitchText = (id: number, text: string) => {
    setPitches(currentPitches => currentPitches.map(p => p.id === id ? { ...p, text } : p));
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
      const { data, error } = await supabase.functions.invoke("analyze-startup", {
        body: { text: pitch.text },
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

      setComparisonInsights(data);
      setShowComparisonDialog(true);
      toast({
        title: "Comparison Complete",
        description: "View full results in the dialog",
      });
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

  const allAnalyzed = pitches.every(p => p.analysis || !p.text.trim());
  const comparisons = getComparison();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">Compare Startups</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/history")} variant="outline">
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
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
            <Button onClick={addPitch} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Startup
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
          <Card className="p-6 mb-6 bg-accent/10 border-accent">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              AI-Powered Comparative Analysis
            </h3>
            
            {comparisonInsights.rankings && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Investment Rankings</h4>
                <div className="space-y-2">
                  {comparisonInsights.rankings.map((ranking: any) => (
                    <div key={ranking.startupName} className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-1">#{ranking.rank}</Badge>
                      <div>
                        <p className="font-medium">{ranking.startupName}</p>
                        <p className="text-sm text-muted-foreground">{ranking.reasoning}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {comparisonInsights.comparativeInsights?.relativePerspective && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Overall Perspective</h4>
                <p className="text-sm text-muted-foreground">{comparisonInsights.comparativeInsights.relativePerspective}</p>
              </div>
            )}

            {comparisonInsights.investmentRecommendation && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Investment Recommendation</h4>
                <p className="text-sm text-muted-foreground">{comparisonInsights.investmentRecommendation}</p>
              </div>
            )}

            <div className="flex justify-center mt-4">
              <Button onClick={() => setShowComparisonDialog(true)} size="lg">
                <TrendingUp className="h-5 w-5 mr-2" />
                View Full Comparison Results
              </Button>
            </div>
          </Card>
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
              {!pitch.analysis && (
                <Button onClick={() => analyzePitch(pitch.id)} disabled={pitch.loading || !pitch.text.trim()}>
                  {pitch.loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : "Analyze"}
                </Button>
              )}
            </Card>
          ))}
        </div>

        {allAnalyzed && pitches.some(p => p.analysis) && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Comparison Table</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Metric</th>
                    {pitches.filter(p => p.analysis).map(pitch => (
                      <th key={pitch.id} className="text-center p-3 font-semibold">{pitch.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scorecardKeys.map(key => (
                    <tr key={key} className="border-b hover:bg-secondary/20">
                       <td className="p-3 font-medium capitalize align-top">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </td>
                      {pitches.filter(p => p.analysis).map(pitch => {
                        const scoreItem = pitch.analysis!.scorecard[key];
                        const score = scoreItem.score;
                        const maxScore = Math.max(...pitches.filter(p => p.analysis).map(p => p.analysis!.scorecard[key].score));
                        return (
                          <td key={pitch.id} className="p-3 align-top">
                            <div className="space-y-1">
                              <div className="text-center">
                                <span className={`text-lg font-bold ${getScoreColor(score)} ${score === maxScore ? 'underline' : ''}`}>
                                  {score}/10
                                </span>
                              </div>
                              {scoreItem.detailedExplanation && (
                                <Collapsible>
                                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto">
                                    Details <ChevronDown className="h-3 w-3" />
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="text-xs text-muted-foreground mt-2">
                                    <p className="text-left">{scoreItem.reasoning}</p>
                                    <Separator className="my-2" />
                                    <p className="text-left">{scoreItem.detailedExplanation}</p>
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

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
              {/* Investment Rankings Section */}
              {comparisonInsights?.rankings && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    🏆 Investment Rankings
                  </h3>
                  <div className="space-y-3">
                    {comparisonInsights.rankings.map((ranking: any) => (
                      <div key={ranking.startupName} className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg">
                        <Badge variant={ranking.rank === 1 ? "default" : "outline"} className="mt-1 text-lg">
                          #{ranking.rank}
                        </Badge>
                        <div className="flex-1">
                          <div className="font-semibold text-base">
                            {(() => {
                              const pitch = pitches.find(p => p.name === ranking.startupName);
                              return pitch ? renderEditableName(pitch) : ranking.startupName;
                            })()}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{ranking.reasoning}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall Perspective Section */}
              {comparisonInsights?.comparativeInsights?.relativePerspective && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    🔍 Overall Perspective
                  </h3>
                  <div className="p-4 bg-accent/10 rounded-lg border border-accent">
                    <p className="text-sm leading-relaxed">
                      {comparisonInsights.comparativeInsights.relativePerspective}
                    </p>
                  </div>
                </div>
              )}

              {/* Investment Recommendation Section */}
              {comparisonInsights?.investmentRecommendation && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    💡 Investment Recommendation
                  </h3>
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm leading-relaxed">
                      {comparisonInsights.investmentRecommendation}
                    </p>
                  </div>
                </div>
              )}

              {/* Detailed Comparison Table */}
              {pitches.filter(p => p.analysis).length >= 2 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    📊 Detailed Score Comparison
                  </h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full">
                      <thead className="bg-secondary/30">
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold sticky left-0 bg-secondary/30">Metric</th>
                          {pitches.filter(p => p.analysis).map(pitch => (
                            <th key={pitch.id} className="text-center p-3 font-semibold min-w-[200px]">
                              {editingNameId === pitch.id ? (
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
                                  className="w-full text-center"
                                  autoFocus
                                />
                              ) : (
                                <div 
                                  className="cursor-pointer hover:bg-secondary/20 rounded px-2 py-1 flex items-center justify-center gap-1"
                                  onClick={() => {
                                    setEditingNameId(pitch.id);
                                    setTempName(pitch.name);
                                  }}
                                >
                                  {pitch.name}
                                  <Edit className="h-3 w-3 opacity-50" />
                                </div>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {scorecardKeys.map(key => (
                          <tr key={key} className="border-b hover:bg-secondary/10">
                            <td className="p-3 font-medium capitalize align-top sticky left-0 bg-background">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </td>
                            {pitches.filter(p => p.analysis).map(pitch => {
                              const scoreItem = pitch.analysis!.scorecard[key];
                              const score = scoreItem.score;
                              const maxScore = Math.max(...pitches.filter(p => p.analysis).map(p => p.analysis!.scorecard[key].score));
                              return (
                                <td key={pitch.id} className="p-3 align-top">
                                  <div className="space-y-2">
                                    <div className="text-center">
                                      <span className={`text-xl font-bold ${getScoreColor(score)} ${score === maxScore ? 'underline decoration-2' : ''}`}>
                                        {score}/10
                                      </span>
                                    </div>
                                    {scoreItem.reasoning && (
                                      <p className="text-xs text-muted-foreground text-left">
                                        {scoreItem.reasoning}
                                      </p>
                                    )}
                                    {scoreItem.detailedExplanation && (
                                      <Collapsible>
                                        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                          More details <ChevronDown className="h-3 w-3" />
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="text-xs text-muted-foreground mt-2 text-left">
                                          {scoreItem.detailedExplanation}
                                        </CollapsibleContent>
                                      </Collapsible>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Comparative Strengths & Weaknesses */}
              {comparisonInsights?.comparativeInsights?.strengths && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-green-600 dark:text-green-400">
                      ✅ Key Strengths
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(comparisonInsights.comparativeInsights.strengths).map(([name, strength]: [string, any]) => (
                        <div key={name} className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="font-medium text-sm">
                            {(() => {
                              const pitch = pitches.find(p => p.name === name);
                              return pitch ? renderEditableName(pitch) : name;
                            })()}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{strength}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-red-600 dark:text-red-400">
                      ⚠️ Key Weaknesses
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(comparisonInsights.comparativeInsights.weaknesses).map(([name, weakness]: [string, any]) => (
                        <div key={name} className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="font-medium text-sm">
                            {(() => {
                              const pitch = pitches.find(p => p.name === name);
                              return pitch ? renderEditableName(pitch) : name;
                            })()}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{weakness}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
