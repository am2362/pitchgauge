import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Loader2, FileText, BarChart, AlertTriangle, MessageSquare, TrendingUp, History, FileInput } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ScoreItem {
  score: number;
  reasoning: string;
}

interface RedFlag {
  severity: "critical" | "high" | "medium";
  issue: string;
  explanation: string;
}

interface AnalysisResult {
  memo: string;
  scorecard: {
    team: ScoreItem;
    marketSize: ScoreItem;
    product: ScoreItem;
    traction: ScoreItem;
    businessModel: ScoreItem;
    defensibility: ScoreItem;
  };
  redFlags?: RedFlag[];
  followUpQuestions?: {
    team: string[];
    market: string[];
    product: string[];
    financials: string[];
    legal: string[];
  };
  investmentThesis?: {
    bullCase: string;
    bearCase: string;
  };
  benchmarking?: {
    overallPercentile: string;
    stageContext: string;
    comparisonNotes: string;
  };
}

const SAMPLE_PITCHES = {
  saas: `EduConnect - AI-Powered Learning Platform

Problem: Traditional education fails to personalize learning, resulting in 40% student dropout rates and poor engagement.

Solution: EduConnect uses AI to create personalized learning paths, adapting in real-time to student performance and learning styles.

Market: $300B global EdTech market growing at 19% CAGR. Target: K-12 schools and universities.

Traction: 50 schools signed (5,000 students), $100K MRR, 85% retention rate, NPS of 72.

Team: CEO (ex-Google engineer), CTO (PhD in AI), CPO (10 years at Coursera).

Business Model: SaaS subscription - $50/student/year. Targeting $1M ARR by end of year.

Defensibility: Proprietary AI algorithms, network effects from student data, partnerships with major publishers.

Seeking: $2M seed round for product development and sales expansion.`,
  
  marketplace: `QuickFix - On-Demand Home Repair Marketplace

Problem: Finding reliable home repair professionals is time-consuming and risky. 60% of homeowners report bad experiences.

Solution: Vetted marketplace connecting homeowners with pre-screened, rated repair professionals in under 2 hours.

Market: $500B home services market in US alone, highly fragmented with no dominant player.

Traction: 2,000 active providers, 10,000 completed jobs, $50K GMV/month growing 40% MoM. 4.8/5 average rating.

Team: Solo founder (ex-TaskRabbit product lead, 8 years marketplace experience).

Business Model: 20% take rate on all transactions. Average job size $200.

Defensibility: Supply-side network effects, proprietary vetting algorithm, local market density.

Seeking: $1.5M seed to expand to 5 new cities and build iOS app.`,
  
  hardware: `ClearAir - Smart Indoor Air Quality Monitor

Problem: Indoor air pollution causes 3.8M deaths/year but remains invisible to homeowners.

Solution: Affordable smart sensor ($99) that monitors air quality and provides actionable recommendations via mobile app.

Market: $5B smart home market, targeting 140M US households.

Traction: Pre-orders: 500 units ($50K), 20,000 waitlist signups, featured in TechCrunch.

Team: Founders met at MIT - mechanical engineer and software developer. No previous startup experience.

Business Model: Hardware sales ($99) + optional subscription for advanced insights ($5/mo).

Defensibility: Patent-pending sensor technology, first-mover in affordable segment.

Seeking: $500K pre-seed for manufacturing and product certification.`
};

const Index = () => {
  const [pitchText, setPitchText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('startup_analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setAnalysisHistory(data || []);
      setShowHistory(true);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const loadTemplate = (template: keyof typeof SAMPLE_PITCHES) => {
    setPitchText(SAMPLE_PITCHES[template]);
    toast({
      title: "Template loaded",
      description: "Sample pitch has been loaded. Click 'Generate Analysis' to evaluate it.",
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      toast({
        title: "PDF uploaded",
        description: file.name,
      });
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
    }
  };

  const saveAnalysis = async (analysisData: AnalysisResult, pitchInput: string) => {
    try {
      const { error } = await supabase
        .from('startup_analyses')
        .insert([{
          pitch_text: pitchInput,
          memo: analysisData.memo,
          scorecard: analysisData.scorecard as any,
          red_flags: analysisData.redFlags as any,
          follow_up_questions: analysisData.followUpQuestions as any,
          investment_thesis: analysisData.investmentThesis ? JSON.stringify(analysisData.investmentThesis) : null,
          benchmarking: analysisData.benchmarking as any,
        }]);
      
      if (error) throw error;
    } catch (error) {
      console.error('Failed to save analysis:', error);
    }
  };

  const handleAnalyze = async () => {
    // Validate input
    if (!pitchText.trim() && !pdfFile) {
      toast({
        title: "Error",
        description: "Please enter pitch text or upload a PDF",
        variant: "destructive",
      });
      return;
    }

    if (pitchText.trim() && pitchText.trim().length < 50) {
      toast({
        title: "Pitch too short",
        description: "Please provide at least 50 characters for a meaningful analysis",
        variant: "destructive",
      });
      return;
    }

    if (pdfFile && pdfFile.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a PDF smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      let analysisInput = pitchText;

      if (pdfFile) {
        const formData = new FormData();
        formData.append("file", pdfFile);

        const { data, error } = await supabase.functions.invoke("analyze-startup", {
          body: formData,
        });

        if (error) throw error;
        setResult(data);
        await saveAnalysis(data, analysisInput);
      } else {
        const { data, error } = await supabase.functions.invoke("analyze-startup", {
          body: { text: analysisInput },
        });

        if (error) throw error;
        setResult(data);
        await saveAnalysis(data, analysisInput);
      }

      toast({
        title: "Analysis complete",
        description: "Your comprehensive startup evaluation is ready",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to analyze pitch. Please try again.";
      console.error("Analysis error:", error);
      
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportAnalysis = () => {
    if (!result) return;
    
    const exportData = JSON.stringify(result, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `startup-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Analysis exported",
      description: "Downloaded as JSON file",
    });
  };

  const ScoreBar = ({ label, scoreItem }: { label: string; scoreItem: ScoreItem }) => {
    const getScoreColor = (score: number) => {
      if (score >= 8) return "from-green-500 to-emerald-500";
      if (score >= 6) return "from-blue-500 to-cyan-500";
      if (score >= 4) return "from-yellow-500 to-orange-500";
      return "from-red-500 to-pink-500";
    };

    return (
      <div className="space-y-3 p-4 bg-card/50 rounded-lg border border-border/50">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-foreground">{label}</span>
          <span className={`text-lg font-bold ${scoreItem.score >= 7 ? 'text-green-500' : scoreItem.score >= 5 ? 'text-blue-500' : 'text-orange-500'}`}>
            {scoreItem.score}/10
          </span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getScoreColor(scoreItem.score)} transition-all duration-700`}
            style={{ width: `${(scoreItem.score / 10) * 100}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{scoreItem.reasoning}</p>
      </div>
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="container max-w-7xl mx-auto px-4 py-12">
        <header className="text-center mb-12 space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Startup Evaluator Assistant
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional VC-grade analysis powered by AI. Get investment memos, scorecards, risk analysis, and actionable insights.
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Input Section */}
          <Card className="p-8 bg-card border-border shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Input Pitch</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Paste Startup Pitch or Load Template
                </label>
                
                <div className="flex gap-2 mb-3 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadTemplate('saas')}
                    className="text-xs"
                  >
                    <FileInput className="h-3 w-3 mr-1" />
                    SaaS Example
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadTemplate('marketplace')}
                    className="text-xs"
                  >
                    <FileInput className="h-3 w-3 mr-1" />
                    Marketplace Example
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadTemplate('hardware')}
                    className="text-xs"
                  >
                    <FileInput className="h-3 w-3 mr-1" />
                    Hardware Example
                  </Button>
                </div>

                <Textarea
                  value={pitchText}
                  onChange={(e) => setPitchText(e.target.value)}
                  placeholder="Paste your startup pitch here... Include: Problem, Solution, Market Size, Traction, Team, Business Model, and what you're seeking."
                  className="min-h-[300px] bg-background border-border resize-none"
                />
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Or Upload Pitch Deck (PDF)
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-secondary/20 hover:bg-secondary/40 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {pdfFile ? pdfFile.name : "Click to upload PDF pitch deck"}
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || (!pitchText && !pdfFile)}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <BarChart className="mr-2 h-5 w-5" />
                    Generate Analysis
                  </>
                )}
              </Button>

              <Button
                onClick={loadHistory}
                variant="outline"
                className="w-full"
              >
                <History className="mr-2 h-4 w-4" />
                View Analysis History
              </Button>
            </div>
          </Card>

          {/* Results Section */}
          <Card className="p-8 bg-card border-border shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Analysis Results</h2>
              </div>
              {result && (
                <Button variant="outline" size="sm" onClick={exportAnalysis}>
                  Export JSON
                </Button>
              )}
            </div>

            {!result && !isAnalyzing && (
              <div className="text-center py-16 space-y-4">
                <div className="w-24 h-24 mx-auto bg-secondary/20 rounded-full flex items-center justify-center">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-lg">
                  Enter a pitch or upload a PDF to get started
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Our AI will generate a comprehensive VC analysis including investment memo, scorecard, red flags, and due diligence questions.
                </p>
              </div>
            )}

            {isAnalyzing && (
              <div className="text-center py-16 space-y-4">
                <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
                <p className="text-lg font-medium text-foreground">Analyzing startup pitch...</p>
                <p className="text-sm text-muted-foreground">
                  Evaluating team, market, product, traction, and generating insights
                </p>
              </div>
            )}

            {result && (
              <Tabs defaultValue="scorecard" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
                  <TabsTrigger value="memo">Memo</TabsTrigger>
                  <TabsTrigger value="risks">Risks</TabsTrigger>
                  <TabsTrigger value="questions">Questions</TabsTrigger>
                  <TabsTrigger value="thesis">Thesis</TabsTrigger>
                </TabsList>

                <TabsContent value="scorecard" className="space-y-6">
                  {result.benchmarking && (
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                      <h3 className="font-semibold text-primary mb-2">Benchmark Analysis</h3>
                      <p className="text-sm mb-1"><strong>Overall:</strong> {result.benchmarking.overallPercentile}</p>
                      <p className="text-sm mb-1"><strong>Stage Context:</strong> {result.benchmarking.stageContext}</p>
                      <p className="text-sm"><strong>Notes:</strong> {result.benchmarking.comparisonNotes}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <ScoreBar label="Team" scoreItem={result.scorecard.team} />
                    <ScoreBar label="Market Size" scoreItem={result.scorecard.marketSize} />
                    <ScoreBar label="Product" scoreItem={result.scorecard.product} />
                    <ScoreBar label="Traction" scoreItem={result.scorecard.traction} />
                    <ScoreBar label="Business Model" scoreItem={result.scorecard.businessModel} />
                    <ScoreBar label="Defensibility" scoreItem={result.scorecard.defensibility} />
                  </div>
                </TabsContent>

                <TabsContent value="memo" className="space-y-4">
                  <div className="prose prose-sm max-w-none bg-background/50 p-6 rounded-lg border border-border">
                    <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                      {result.memo}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="risks" className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <h3 className="text-lg font-semibold">Red Flags & Risk Analysis</h3>
                  </div>
                  
                  {result.redFlags && result.redFlags.length > 0 ? (
                    <div className="space-y-3">
                      {result.redFlags.map((flag, index) => (
                        <div key={index} className="p-4 border border-border rounded-lg bg-card/50">
                          <div className="flex items-start gap-3">
                            <Badge variant={getSeverityColor(flag.severity) as any} className="mt-1">
                              {flag.severity.toUpperCase()}
                            </Badge>
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground mb-1">{flag.issue}</h4>
                              <p className="text-sm text-muted-foreground">{flag.explanation}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No major red flags identified.</p>
                  )}
                </TabsContent>

                <TabsContent value="questions" className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Due Diligence Questions</h3>
                  </div>
                  
                  {result.followUpQuestions && (
                    <div className="space-y-6">
                      {Object.entries(result.followUpQuestions).map(([category, questions]) => (
                        <div key={category}>
                          <h4 className="font-semibold text-foreground capitalize mb-3">{category}</h4>
                          <ul className="space-y-2">
                            {(questions as string[]).map((question, index) => (
                              <li key={index} className="flex gap-3 text-sm text-muted-foreground">
                                <span className="text-primary font-mono">Q{index + 1}:</span>
                                <span>{question}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="thesis" className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Investment Thesis</h3>
                  </div>

                  {result.investmentThesis && (
                    <div className="space-y-6">
                      <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <h4 className="font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Bull Case
                        </h4>
                        <p className="text-foreground leading-relaxed">{result.investmentThesis.bullCase}</p>
                      </div>

                      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <h4 className="font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Bear Case
                        </h4>
                        <p className="text-foreground leading-relaxed">{result.investmentThesis.bearCase}</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </Card>
        </div>

        {/* History Section */}
        {showHistory && analysisHistory.length > 0 && (
          <Card className="p-8 bg-card border-border shadow-lg">
            <h3 className="text-xl font-bold mb-4">Recent Analyses</h3>
            <div className="space-y-3">
              {analysisHistory.map((analysis) => (
                <div key={analysis.id} className="p-4 bg-secondary/20 rounded-lg border border-border">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">
                        {new Date(analysis.created_at).toLocaleString()}
                      </p>
                      <p className="text-sm text-foreground line-clamp-2">
                        {analysis.pitch_text.substring(0, 150)}...
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const investmentThesis = analysis.investment_thesis 
                          ? (typeof analysis.investment_thesis === 'string' 
                              ? JSON.parse(analysis.investment_thesis) 
                              : analysis.investment_thesis)
                          : undefined;
                        
                        setResult({
                          memo: analysis.memo,
                          scorecard: analysis.scorecard,
                          redFlags: analysis.red_flags,
                          followUpQuestions: analysis.follow_up_questions,
                          investmentThesis,
                          benchmarking: analysis.benchmarking,
                        });
                        setPitchText(analysis.pitch_text);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;