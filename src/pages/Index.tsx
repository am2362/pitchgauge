import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Loader2, FileText, BarChart, AlertTriangle, MessageSquare, TrendingUp, History, FileInput, LogOut, GitCompare, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Session } from "@supabase/supabase-js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { exportAnalysisToPDF } from "@/lib/pdf-export";

interface ScoreItem {
  score: number;
  reasoning: string;
  detailedExplanation?: string;
}

interface RedFlag {
  severity: "critical" | "high" | "medium";
  issue: string;
  explanation: string;
}

interface AnalysisResult {
  startupName?: string;
  memo: string | Record<string, string>;
  scorecard: {
    team: ScoreItem;
    marketSize: ScoreItem;
    traction: ScoreItem;
    productDifferentiation: ScoreItem;
    businessModel: ScoreItem;
    competitiveLandscape: ScoreItem;
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

interface HistoryItem {
  id: string;
  created_at: string;
  pitch_text: string;
  memo: string;
  scorecard: any;
  red_flags: any;
  follow_up_questions: any;
  investment_thesis: string;
  benchmarking: any;
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
  const [startupName, setStartupName] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPdfParsing, setIsPdfParsing] = useState(false);
  const [pdfProgress, setPdfProgress] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Extract startup name from pitch text (first line if it looks like a name)
  const extractStartupName = (pitchText: string): string | null => {
    const firstLine = pitchText.trim().split('\n')[0].trim();
    if (firstLine.length > 0 && firstLine.length < 100 && !firstLine.includes(':')) {
      return firstLine;
    }
    return null;
  };

  useEffect(() => {
    // Check auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        loadHistory();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        loadHistory();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from('startup_analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setHistory(data);
    }
  };

  const loadTemplate = (template: keyof typeof SAMPLE_PITCHES) => {
    const pitchText = SAMPLE_PITCHES[template];
    setPitchText(pitchText);
    setStartupName(extractStartupName(pitchText) || "");
    toast({
      title: "Template loaded",
      description: "Sample pitch has been loaded. Click 'Generate Analysis' to evaluate it.",
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    setPdfFile(file);
    setIsAnalyzing(true);

    try {
      // Parse PDF using document parser
      const { default: parseDocument } = await import("@/lib/document-parser");
      const parsedContent = await parseDocument(file);
      
      setPitchText(parsedContent.text);
      setPdfFile(null);
      
      toast({
        title: "PDF parsed successfully",
        description: "Text extracted from PDF. You can now analyze it.",
      });
    } catch (error: any) {
      toast({
        title: "PDF parsing failed",
        description: error.message || "Please try copying and pasting the text instead",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveAnalysis = async (analysisData: AnalysisResult, pitchInput: string) => {
    if (!user) return;

    try {
      const startupNameToSave = analysisData.startupName || startupName.trim() || extractStartupName(pitchInput) || null;
      console.log('Saving with startup_name:', startupNameToSave);
      
      const { error } = await supabase
        .from('startup_analyses')
        .insert([{
          user_id: user.id,
          startup_name: startupNameToSave,
          pitch_text: pitchInput,
          memo: typeof analysisData.memo === 'string' ? analysisData.memo : JSON.stringify(analysisData.memo),
          scorecard: analysisData.scorecard as any,
          red_flags: analysisData.redFlags as any,
          follow_up_questions: analysisData.followUpQuestions as any,
          investment_thesis: analysisData.investmentThesis ? JSON.stringify(analysisData.investmentThesis) : null,
          benchmarking: analysisData.benchmarking as any,
        }]);
      
      if (error) throw error;
      await loadHistory();
    } catch (error) {
      console.error('Failed to save analysis:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!pitchText.trim()) {
      toast({
        title: "Error",
        description: "Please enter pitch text",
        variant: "destructive",
      });
      return;
    }

    if (pitchText.trim().length < 50) {
      toast({
        title: "Pitch too short",
        description: "Please provide at least 50 characters",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-startup", {
        body: { text: pitchText },
      });

      if (error) throw error;
      console.log('AI Response:', data);
      console.log('Startup Name from AI:', data.startupName);
      setResult(data);
      await saveAnalysis(data, pitchText);
      setStartupName("");

      toast({
        title: "Analysis complete",
        description: "Your comprehensive startup evaluation is ready",
      });
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const viewHistoricalAnalysis = (item: HistoryItem) => {
    let memoData: string | Record<string, string>;
    try {
      memoData = typeof item.memo === 'string' && item.memo.startsWith('{') 
        ? JSON.parse(item.memo) 
        : item.memo;
    } catch {
      memoData = item.memo;
    }

    // Normalize scorecard to handle both old and new field names
    const scorecard = item.scorecard as any;
    const normalizedScorecard = {
      team: scorecard.team || { score: 0, reasoning: 'N/A' },
      marketSize: scorecard.marketSize || { score: 0, reasoning: 'N/A' },
      traction: scorecard.traction || { score: 0, reasoning: 'N/A' },
      productDifferentiation: scorecard.productDifferentiation || scorecard.product || { score: 0, reasoning: 'N/A' },
      businessModel: scorecard.businessModel || { score: 0, reasoning: 'N/A' },
      competitiveLandscape: scorecard.competitiveLandscape || scorecard.defensibility || { score: 0, reasoning: 'N/A' },
    };

    const analysisResult: AnalysisResult = {
      memo: memoData,
      scorecard: normalizedScorecard,
      redFlags: item.red_flags,
      followUpQuestions: item.follow_up_questions,
      investmentThesis: item.investment_thesis ? JSON.parse(item.investment_thesis) : undefined,
      benchmarking: item.benchmarking,
    };
    setResult(analysisResult);
    setPitchText(item.pitch_text);
    
    toast({
      title: "Analysis loaded",
      description: `Viewing analysis from ${new Date(item.created_at).toLocaleDateString()}`,
    });
  };

  const exportAnalysis = () => {
    if (!result) return;
    const dataStr = JSON.stringify(result, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `startup-analysis-${Date.now()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const ScoreBar = ({ label, scoreItem }: { label: string; scoreItem: ScoreItem }) => {
    // Safety check for undefined scoreItem
    if (!scoreItem || typeof scoreItem.score !== 'number') {
      return (
        <div className="space-y-3 p-4 bg-card/50 rounded-lg border border-border/50">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-foreground">{label}</span>
            <span className="text-lg font-bold text-muted-foreground">N/A</span>
          </div>
          <p className="text-sm text-muted-foreground">No data available</p>
        </div>
      );
    }

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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="container max-w-7xl mx-auto px-4 py-12">
        <header className="text-center mb-12 space-y-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                VentureAI
              </h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/compare")}>
                <GitCompare className="h-4 w-4 mr-2" />
                Compare
              </Button>
              <Button variant="outline" onClick={() => navigate("/history")}>
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
              <Button variant="outline" onClick={() => navigate("/bulk-analysis")}>
                <BarChart className="h-4 w-4 mr-2" />
                Bulk Analysis
              </Button>
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
          <p className="text-xl text-muted-foreground">
            AI-Powered Comprehensive Startup Pitch Analysis
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="p-8 bg-card border-border shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Input Pitch</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Startup Name (Optional)
                </label>
                <Input
                  placeholder="e.g., EduConnect, QuickFix..."
                  value={startupName}
                  onChange={(e) => setStartupName(e.target.value)}
                  className="w-full mb-4"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Paste Startup Pitch or Load Template
                </label>
                
                <div className="flex gap-2 mb-3 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => loadTemplate('saas')} className="text-xs">
                    <FileInput className="h-3 w-3 mr-1" />
                    SaaS Example
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => loadTemplate('marketplace')} className="text-xs">
                    <FileInput className="h-3 w-3 mr-1" />
                    Marketplace Example
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => loadTemplate('hardware')} className="text-xs">
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
                    <p className="text-sm text-muted-foreground text-center px-4">
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
                disabled={isAnalyzing || !pitchText.trim()}
                className="w-full h-12 text-lg font-semibold"
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
            </div>
          </Card>

          <Card className="p-8 bg-card border-border shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <History className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Recent Analyses</h2>
            </div>

            {history.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No analyses yet. Create your first one!</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {history.map((item) => (
                  <Card
                    key={item.id}
                    className="p-4 cursor-pointer hover:bg-secondary/50 transition-all"
                    onClick={() => viewHistoricalAnalysis(item)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium line-clamp-2">{item.pitch_text.substring(0, 100)}...</p>
                      <Badge variant="outline" className="ml-2 shrink-0">
                        {new Date(item.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click to view analysis
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>

        {result && (
          <Card className="mt-8 p-8 bg-card border-border shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-foreground">Analysis Results</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportAnalysis}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
                <Button variant="outline" onClick={() => exportAnalysisToPDF(result, "Startup")}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>

            <Tabs defaultValue="scorecard" className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-8">
                <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
                <TabsTrigger value="memo">Memo</TabsTrigger>
                <TabsTrigger value="risks">Red Flags</TabsTrigger>
                <TabsTrigger value="questions">Questions</TabsTrigger>
                <TabsTrigger value="thesis">Thesis</TabsTrigger>
                <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
              </TabsList>

              <TabsContent value="scorecard" className="space-y-6">
                <ScoreBar label="Team Quality" scoreItem={result.scorecard.team} />
                <ScoreBar label="Market Size" scoreItem={result.scorecard.marketSize} />
                <ScoreBar label="Product Differentiation" scoreItem={result.scorecard.productDifferentiation} />
                <ScoreBar label="Traction" scoreItem={result.scorecard.traction} />
                <ScoreBar label="Business Model" scoreItem={result.scorecard.businessModel} />
                <ScoreBar label="Competitive Landscape" scoreItem={result.scorecard.competitiveLandscape} />
              </TabsContent>

              <TabsContent value="memo">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="space-y-4">
                    {typeof result.memo === 'string' ? (
                      <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                        {result.memo}
                      </div>
                    ) : (
                      Object.entries(result.memo as Record<string, string>).map(([section, content]) => (
                        <div key={section} className="mb-4">
                          <h3 className="text-lg font-semibold mb-2 text-foreground">{section}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="risks" className="space-y-4">
                {result.redFlags && result.redFlags.length > 0 ? (
                  result.redFlags.map((flag, index) => (
                    <Card key={index} className="p-5 border-l-4 border-l-destructive">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-foreground">{flag.issue}</h4>
                            <Badge variant={getSeverityColor(flag.severity)}>
                              {flag.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {flag.explanation}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No red flags identified</p>
                )}
              </TabsContent>

              <TabsContent value="questions" className="space-y-6">
                {result.followUpQuestions && (
                  <>
                    {Object.entries(result.followUpQuestions).map(([category, questions]) => (
                      <div key={category}>
                        <h3 className="text-lg font-semibold mb-3 capitalize text-foreground">
                          {category}
                        </h3>
                        <ul className="space-y-2">
                          {questions.map((q, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-1" />
                              <span className="text-sm text-muted-foreground">{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </>
                )}
              </TabsContent>

              <TabsContent value="thesis" className="space-y-6">
                {result.investmentThesis && (
                  <>
                    <Card className="p-6 bg-green-500/10 border-green-500/20">
                      <h3 className="text-lg font-semibold mb-3 text-green-500">Bull Case</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {result.investmentThesis.bullCase}
                      </p>
                    </Card>
                    <Card className="p-6 bg-red-500/10 border-red-500/20">
                      <h3 className="text-lg font-semibold mb-3 text-red-500">Bear Case</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {result.investmentThesis.bearCase}
                      </p>
                    </Card>
                  </>
                )}
              </TabsContent>

              <TabsContent value="benchmark" className="space-y-4">
                {result.benchmarking && (
                  <>
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-2 text-foreground">Overall Percentile</h3>
                      <p className="text-2xl font-bold text-primary">{result.benchmarking.overallPercentile}</p>
                    </Card>
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-2 text-foreground">Stage Context</h3>
                      <p className="text-muted-foreground leading-relaxed">{result.benchmarking.stageContext}</p>
                    </Card>
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-2 text-foreground">Comparison Notes</h3>
                      <p className="text-muted-foreground leading-relaxed">{result.benchmarking.comparisonNotes}</p>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
