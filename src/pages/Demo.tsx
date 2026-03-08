import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, BarChart, AlertTriangle, MessageSquare, TrendingUp, FileDown, Lock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DEMO_ANALYSIS_RESULT, DEMO_PITCH_TEXT, DEMO_STARTUP_NAME } from "@/lib/demo-data";

interface ScoreItem {
  score: number;
  reasoning: string;
  detailedExplanation?: string;
}

const Demo = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const result = DEMO_ANALYSIS_RESULT;

  const handleAnalyzeAttempt = () => {
    toast({
      title: "Demo Mode",
      description: "Sign up for a free account to analyze your own pitches!",
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
      case "critical": return "destructive" as const;
      case "high": return "destructive" as const;
      case "medium": return "secondary" as const;
      default: return "outline" as const;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      {/* Demo Nav */}
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto flex h-14 items-center justify-between px-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              PitchGauge
            </span>
          </button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Demo Mode
            </Badge>
            <Button size="sm" onClick={() => navigate("/auth")} className="gap-1.5">
              Sign Up Free <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Demo banner */}
        <Card className="p-4 mb-8 border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">You're viewing a demo analysis</p>
                <p className="text-sm text-muted-foreground">Sign up for free to analyze your own startup pitches</p>
              </div>
            </div>
            <Button onClick={() => navigate("/auth")} className="gap-1.5">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        <header className="text-center mb-8 space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Single Pitch Analysis</h2>
          <p className="text-muted-foreground">
            AI-Powered Comprehensive Startup Pitch Analysis
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input side — read-only with demo pitch */}
          <Card className="p-8 bg-card border-border shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Input Pitch</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Startup Name
                </label>
                <Input value={DEMO_STARTUP_NAME} readOnly className="w-full mb-4 opacity-75" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Pitch Text
                </label>
                <Textarea
                  value={DEMO_PITCH_TEXT}
                  readOnly
                  className="min-h-[300px] bg-background border-border resize-none opacity-75"
                />
              </div>
              <Separator />
              <Button onClick={handleAnalyzeAttempt} className="w-full h-12 text-lg font-semibold">
                <Lock className="mr-2 h-5 w-5" />
                Sign Up to Analyze Your Own Pitches
              </Button>
            </div>
          </Card>

          {/* History side — empty with CTA */}
          <Card className="p-8 bg-card border-border shadow-lg flex flex-col items-center justify-center text-center">
            <Lock className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Analysis History</h3>
            <p className="text-muted-foreground mb-6">Create an account to save and revisit your analyses</p>
            <Button variant="outline" onClick={() => navigate("/auth")}>
              Sign Up to Save Analyses
            </Button>
          </Card>
        </div>

        {/* Results */}
        <Card className="mt-8 p-8 bg-card border-border shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-foreground">
              Analysis Results — {DEMO_STARTUP_NAME}
            </h2>
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" /> Demo
            </Badge>
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
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="space-y-4">
                  {Object.entries(result.memo).map(([section, content]) => (
                    <div key={section} className="mb-4">
                      <h3 className="text-lg font-semibold mb-2 text-foreground">{section}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
                    </div>
                  ))}
                </div>
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
            <Button size="lg" variant="outline" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Demo;
