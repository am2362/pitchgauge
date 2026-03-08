import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, ArrowRight, Trophy, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DEMO_COMPARISON_PITCHES,
  DEMO_COMPARISON_RESULTS,
  DEMO_COMPARISON_INSIGHTS,
} from "@/lib/demo-data";
import { DemoBanner } from "@/components/DemoBanner";
import { DemoNav } from "@/components/DemoNav";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useCountUp } from "@/hooks/useCountUp";

const DemoCompare = () => {
  usePageMeta("Demo Compare | PitchGauge", "See how PitchGauge compares multiple startups side-by-side.");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleLoadDemo = () => {
    setLoading(true);
    setShowResults(false);
  };

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      setShowResults(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [loading]);

  const handleSignupPrompt = () => {
    toast({ title: "Demo Mode", description: "Sign up for a free account to access this feature!" });
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-blue-500";
    return "text-orange-500";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 8) return "bg-green-500";
    if (score >= 6) return "bg-blue-500";
    return "bg-orange-500";
  };

  const scorecardKeys = ["team", "marketSize", "productDifferentiation", "traction", "businessModel", "competitiveLandscape"] as const;
  const scorecardLabels: Record<string, string> = {
    team: "Team", marketSize: "Market", productDifferentiation: "Product",
    traction: "Traction", businessModel: "Business Model", competitiveLandscape: "Competition",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <DemoBanner />
      <DemoNav />

      <div className="container max-w-7xl mx-auto px-4 py-8">
        <header className="text-center mb-8 space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Startup Comparison</h1>
          <p className="text-muted-foreground">Compare multiple startups side-by-side</p>
        </header>

        {!showResults && !loading && (
          <div className="text-center">
            <Card className="max-w-lg mx-auto p-8">
              <h2 className="text-xl font-bold mb-2 text-foreground">Load Demo Comparison</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Pre-filled with 3 startups: EcoTrack, FinFlow, and MediSync
              </p>
              <Button size="lg" onClick={handleLoadDemo} className="gap-2">
                Load Demo <ArrowRight className="h-4 w-4" />
              </Button>
            </Card>
          </div>
        )}

        {loading && (
          <Card className="max-w-lg mx-auto p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground">Analysing all startups...</p>
            <p className="text-sm text-muted-foreground mt-2">Comparing 3 startups side-by-side</p>
          </Card>
        )}

        {showResults && (
          <div className="space-y-8 animate-fade-in">
            {/* Pitches summary */}
            <div className="grid md:grid-cols-3 gap-4">
              {DEMO_COMPARISON_PITCHES.map((p) => (
                <Card key={p.id} className="p-5">
                  <h3 className="font-bold text-foreground mb-2">{p.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3">{p.text}</p>
                </Card>
              ))}
            </div>

            {/* Rankings */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" /> Investment Rankings
              </h2>
              <div className="space-y-3">
                {DEMO_COMPARISON_INSIGHTS.rankings.map((r) => (
                  <div key={r.rank} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                    <span className="text-2xl font-extrabold text-primary w-8">#{r.rank}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.topStrengths.join(" · ")}</p>
                    </div>
                    <span className={`text-xl font-bold ${getScoreColor(r.overallScore)}`}>{r.overallScore}/10</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Detailed Score Cards with Reasoning */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 text-foreground">Detailed Score Breakdown</h2>
              <Accordion type="multiple" className="space-y-3">
                {DEMO_COMPARISON_RESULTS.map((r) => (
                  <AccordionItem key={r.startupName} value={r.startupName} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-foreground">{r.startupName}</span>
                        <Badge variant="outline" className="text-xs">
                          {Object.values(r.scorecard).reduce((sum, s) => sum + s.score, 0) / Object.values(r.scorecard).length > 7 ? "Strong" : "Moderate"}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {scorecardKeys.map((key) => {
                          const entry = r.scorecard[key];
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
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(DEMO_COMPARISON_INSIGHTS.strengthsWeaknesses).map(([name, sw]) => (
                <Card key={name} className="p-5">
                  <h3 className="font-bold text-foreground mb-3">{name}</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-green-600 flex items-center gap-1 mb-1">
                        <ThumbsUp className="h-3 w-3" /> Strengths
                      </p>
                      <ul className="space-y-1">
                        {sw.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-red-500 flex items-center gap-1 mb-1">
                        <ThumbsDown className="h-3 w-3" /> Weaknesses
                      </p>
                      <ul className="space-y-1">
                        {sw.weaknesses.map((w, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Recommendation */}
            <Card className="p-6 border-primary/30 bg-primary/5">
              <h2 className="text-xl font-bold mb-3 text-foreground">Overall Recommendation</h2>
              <p className="text-muted-foreground leading-relaxed">{DEMO_COMPARISON_INSIGHTS.overallRecommendation}</p>
            </Card>

            {/* Export buttons */}
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleSignupPrompt} className="gap-1">
                <Lock className="h-3 w-3" /> Export PDF
              </Button>
              <Button variant="outline" onClick={handleSignupPrompt} className="gap-1">
                <Lock className="h-3 w-3" /> Save Comparison
              </Button>
            </div>

            {/* Bottom CTA */}
            <Card className="p-8 text-center border-primary/30 bg-primary/5">
              <h3 className="text-2xl font-bold text-foreground mb-2">Compare your own deal flow</h3>
              <p className="text-muted-foreground mb-6">Sign up to compare up to 5 startups with full AI analysis</p>
              <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
                Start for Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoCompare;
