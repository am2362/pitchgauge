import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { ArrowLeft, Loader2, TrendingUp, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ScoreItem {
  score: number;
  reasoning: string;
}

interface Scorecard {
  team: ScoreItem;
  marketSize: ScoreItem;
  product: ScoreItem;
  traction: ScoreItem;
  businessModel: ScoreItem;
  defensibility: ScoreItem;
}

interface AnalysisResult {
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
    if (pitches.length < 3) {
      setPitches([...pitches, {
        id: pitches.length + 1,
        name: `Startup ${String.fromCharCode(65 + pitches.length)}`,
        text: "",
        analysis: null,
        loading: false
      }]);
    }
  };

  const removePitch = (id: number) => {
    if (pitches.length > 2) {
      setPitches(pitches.filter(p => p.id !== id));
    }
  };

  const updatePitchText = (id: number, text: string) => {
    setPitches(pitches.map(p => p.id === id ? { ...p, text } : p));
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

    setPitches(pitches.map(p => p.id === id ? { ...p, loading: true } : p));

    try {
      const { data, error } = await supabase.functions.invoke("analyze-startup", {
        body: { text: pitch.text },
      });

      if (error) throw error;

      setPitches(pitches.map(p => p.id === id ? { ...p, analysis: data, loading: false } : p));

      toast({
        title: "Analysis Complete",
        description: `${pitch.name} analysis ready`,
      });
    } catch (error: any) {
      setPitches(pitches.map(p => p.id === id ? { ...p, loading: false } : p));
      toast({
        title: "Analysis Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const analyzeAll = async () => {
    for (const pitch of pitches) {
      if (pitch.text.trim() && !pitch.analysis) {
        await analyzePitch(pitch.id);
      }
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-blue-500";
    if (score >= 4) return "text-yellow-500";
    return "text-red-500";
  };

  const scorecardKeys: Array<keyof Scorecard> = ['team', 'marketSize', 'product', 'traction', 'businessModel', 'defensibility'];

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
            {pitches.length < 3 && (
              <Button onClick={addPitch} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Startup
              </Button>
            )}
            <Button onClick={analyzeAll} disabled={pitches.some(p => p.loading)}>
              {pitches.some(p => p.loading) ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
              ) : (
                "Analyze All"
              )}
            </Button>
          </div>
        </div>

        {comparisons && comparisons.length > 0 && (
          <Card className="p-6 mb-6 bg-accent/10 border-accent">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Comparative Insights
            </h3>
            <ul className="space-y-2">
              {comparisons.map((comp, idx) => (
                <li key={idx} className="text-sm text-muted-foreground">• {comp}</li>
              ))}
            </ul>
          </Card>
        )}

        <div className="grid gap-6 mb-6">
          {pitches.map((pitch) => (
            <Card key={pitch.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{pitch.name}</h2>
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
                      <td className="p-3 font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </td>
                      {pitches.filter(p => p.analysis).map(pitch => {
                        const score = pitch.analysis!.scorecard[key].score;
                        const maxScore = Math.max(...pitches.filter(p => p.analysis).map(p => p.analysis!.scorecard[key].score));
                        return (
                          <td key={pitch.id} className="p-3 text-center">
                            <span className={`text-lg font-bold ${getScoreColor(score)} ${score === maxScore ? 'underline' : ''}`}>
                              {score}/10
                            </span>
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
      </div>
    </div>
  );
}
