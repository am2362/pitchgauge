import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { FileText, AlertTriangle, MessageSquare, Lock, ArrowRight, Upload, Loader2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  DEMO_TEXT_STARTUP_NAME,
  DEMO_TEXT_PITCH_TEXT,
  DEMO_TEXT_ANALYSIS_RESULT,
  DEMO_PDF_ANALYSIS_RESULT,
} from "@/lib/demo-data";
import { DemoBanner } from "@/components/DemoBanner";
import { DemoNav } from "@/components/DemoNav";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useCountUp } from "@/hooks/useCountUp";
import { exportDemoAnalysisToPDF } from "@/lib/pdf-export";

interface ScoreItem {
  score: number;
  reasoning: string;
  detailedExplanation?: string;
}

type PdfStep = { msg: string; delay: number };

const PDF_STEPS: PdfStep[] = [
  { msg: "Uploading PDF...", delay: 1000 },
  { msg: "Extracting text from 20 pages...", delay: 1500 },
  { msg: "Analysing pitch content...", delay: 2000 },
  { msg: "Generating scorecard...", delay: 1000 },
];

const AnimatedScore = ({ score }: { score: number }) => {
  const animated = useCountUp(score, 800, true);
  return <>{animated}</>;
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
          <AnimatedScore score={scoreItem.score} />/10
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

const Demo = () => {
  usePageMeta("Demo | PitchGauge", "Try PitchGauge's AI pitch analysis with a sample startup — no signup required.");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeResult, setActiveResult] = useState<"text" | "pdf">("text");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfStepIndex, setPdfStepIndex] = useState(-1);
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfAnalyzed, setPdfAnalyzed] = useState(false);
  const [isDemoAnalyzing, setIsDemoAnalyzing] = useState(false);

  const result = activeResult === "pdf" ? DEMO_PDF_ANALYSIS_RESULT : DEMO_TEXT_ANALYSIS_RESULT;

  const handlePdfDemo = useCallback(() => {
    setPdfUploading(true);
    setPdfStepIndex(0);
    setPdfReady(false);
    setPdfAnalyzed(false);
  }, []);

  useEffect(() => {
    if (!pdfUploading || pdfStepIndex < 0) return;
    if (pdfStepIndex >= PDF_STEPS.length) {
      setPdfUploading(false);
      setPdfReady(true);
      return;
    }
    const timer = setTimeout(() => {
      setPdfStepIndex((i) => i + 1);
    }, PDF_STEPS[pdfStepIndex].delay);
    return () => clearTimeout(timer);
  }, [pdfUploading, pdfStepIndex]);

  const handleDemoAnalyze = useCallback(() => {
    if (pdfReady && !pdfAnalyzed) {
      setIsDemoAnalyzing(true);
      setTimeout(() => {
        setIsDemoAnalyzing(false);
        setPdfAnalyzed(true);
        setActiveResult("pdf");
      }, 2000);
    }
  }, [pdfReady, pdfAnalyzed]);

  const handleSignupPrompt = () => {
    toast({ title: "Demo Mode", description: "Sign up for a free account to access this feature!" });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": case "high": return "destructive" as const;
      case "medium": return "secondary" as const;
      default: return "outline" as const;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <DemoBanner />
      <DemoNav />

      <div className="container max-w-7xl mx-auto px-4 py-8">
        <header className="text-center mb-8 space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Single Pitch Analysis</h1>
          <p className="text-muted-foreground">AI-Powered Comprehensive Startup Pitch Analysis</p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Card 1: Text Input Demo — FinFlow */}
          <Card
            className={`p-8 bg-card border-border shadow-lg cursor-pointer transition-all ${activeResult === "text" ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"}`}
            onClick={() => setActiveResult("text")}
          >
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Demo: Paste Pitch Text</h2>
              {activeResult === "text" && <Badge variant="default" className="ml-auto">Active</Badge>}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Startup Name</label>
                <Input value={DEMO_TEXT_STARTUP_NAME} readOnly className="w-full opacity-75" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Pitch Text</label>
                <Textarea value={DEMO_TEXT_PITCH_TEXT} readOnly className="min-h-[180px] bg-background border-border resize-none opacity-75" />
              </div>
              <Separator />
              <Button onClick={handleSignupPrompt} className="w-full h-12 text-lg font-semibold">
                <Lock className="mr-2 h-5 w-5" /> Sign Up to Analyze Your Own Pitches
              </Button>
            </div>
          </Card>

          {/* Card 2: PDF Upload Demo — EcoTrack */}
          <Card
            className={`p-8 bg-card border-border shadow-lg cursor-pointer transition-all ${activeResult === "pdf" && pdfAnalyzed ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"}`}
            onClick={() => { if (pdfAnalyzed) setActiveResult("pdf"); }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Upload className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Demo: Upload Pitch Deck PDF</h2>
              {activeResult === "pdf" && pdfAnalyzed && <Badge variant="default" className="ml-auto">Active</Badge>}
            </div>

            {pdfReady ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <FileText className="h-8 w-8 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">EcoTrack_PitchDeck.pdf</p>
                    <p className="text-xs text-muted-foreground">20 pages extracted · Ready for analysis</p>
                  </div>
                  {pdfAnalyzed && <Badge variant="secondary" className="ml-auto">Analyzed</Badge>}
                </div>
                <Separator />
                {!pdfAnalyzed ? (
                  <Button
                    onClick={(e) => { e.stopPropagation(); handleDemoAnalyze(); }}
                    disabled={isDemoAnalyzing}
                    className="w-full h-12 text-lg font-semibold"
                  >
                    {isDemoAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing with AI...
                      </>
                    ) : (
                      "Generate Analysis"
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleSignupPrompt} className="w-full h-12 text-lg font-semibold">
                    <Lock className="mr-2 h-5 w-5" /> Sign Up to Analyze Your Own Pitches
                  </Button>
                )}
              </div>
            ) : !pdfUploading ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Upload a sample pitch deck to see how PDF analysis works.</p>
                <Button onClick={(e) => { e.stopPropagation(); handlePdfDemo(); }} variant="outline" className="w-full h-12 gap-2">
                  <Upload className="h-5 w-5" /> Upload EcoTrack Pitch Deck (Demo)
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">EcoTrack_PitchDeck.pdf</p>
                    <p className="text-xs text-muted-foreground">20 pages</p>
                  </div>
                </div>
                {pdfStepIndex >= 0 && pdfStepIndex < PDF_STEPS.length && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm font-medium text-foreground">{PDF_STEPS[pdfStepIndex].msg}</span>
                    </div>
                    <Progress value={((pdfStepIndex + 1) / PDF_STEPS.length) * 100} className="h-2" />
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Results */}
        <Card className="mt-8 p-8 bg-card border-border shadow-lg animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-foreground">
              Analysis Results — {result.startupName}
              <Badge variant="secondary" className="ml-3">
                {activeResult === "pdf" ? "PDF Upload" : "Text Input"}
              </Badge>
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportDemoAnalysisToPDF(
                  result as any,
                  result.startupName || "Startup",
                  activeResult === "text" ? "PitchScore_FinFlow_Analysis.pdf" : "PitchGauge_EcoTrack_Analysis.pdf"
                )}
                className="gap-1"
              >
                <Download className="h-3 w-3" /> Download PDF
              </Button>
              <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" /> Demo</Badge>
            </div>
          </div>

          <Tabs defaultValue="scorecard" className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-8">
              <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
              <TabsTrigger value="memo">Summary</TabsTrigger>
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
              <div className="space-y-4">
                {Object.entries(result.memo).map(([section, content]) => (
                  <div key={section} className="mb-4">
                    <h3 className="text-lg font-semibold mb-2 text-foreground">{section}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="risks" className="space-y-4">
              {result.redFlags.map((flag, index) => (
                <Card key={index} className="p-5 border-l-4 border-l-destructive">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-foreground">{flag.issue}</h4>
                        <Badge variant={getSeverityColor(flag.severity)}>{flag.severity}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{flag.explanation}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="questions" className="space-y-6">
              {Object.entries(result.followUpQuestions).map(([category, questions]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3 capitalize text-foreground">{category}</h3>
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
            </TabsContent>

            <TabsContent value="thesis" className="space-y-6">
              <Card className="p-6 bg-green-500/10 border-green-500/20">
                <h3 className="text-lg font-semibold mb-3 text-green-500">Bull Case</h3>
                <p className="text-muted-foreground leading-relaxed">{result.investmentThesis.bullCase}</p>
              </Card>
              <Card className="p-6 bg-red-500/10 border-red-500/20">
                <h3 className="text-lg font-semibold mb-3 text-red-500">Bear Case</h3>
                <p className="text-muted-foreground leading-relaxed">{result.investmentThesis.bearCase}</p>
              </Card>
            </TabsContent>

            <TabsContent value="benchmark" className="space-y-4">
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
            </TabsContent>
          </Tabs>
        </Card>

        {/* Bottom CTA */}
        <Card className="mt-8 p-8 text-center border-primary/30 bg-primary/5">
          <h3 className="text-2xl font-bold text-foreground mb-2">Ready to analyze your own pitches?</h3>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Get 3 free analyses per day. Score pitches, compare startups, and bulk-process your deal flow.
          </p>
          <div className="flex justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              Start for Free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/")}>Back to Home</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Demo;
