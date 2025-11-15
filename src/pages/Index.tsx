import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Upload, Loader2, FileText, BarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResult {
  memo: string;
  scorecard: {
    team: number;
    marketSize: number;
    product: number;
    traction: number;
    businessModel: number;
    defensibility: number;
  };
}

const Index = () => {
  const [pitchText, setPitchText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

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

  const handleAnalyze = async () => {
    if (!pitchText && !pdfFile) {
      toast({
        title: "No input provided",
        description: "Please provide a pitch text or upload a PDF",
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
      } else {
        const { data, error } = await supabase.functions.invoke("analyze-startup", {
          body: { text: analysisInput },
        });

        if (error) throw error;
        setResult(data);
      }

      toast({
        title: "Analysis complete",
        description: "Your startup evaluation is ready",
      });
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const ScoreBar = ({ label, score }: { label: string; score: number }) => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-primary font-semibold">{score}/10</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <header className="text-center mb-12 space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Startup Evaluator Assistant
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered venture capital analysis using Gemini. Evaluate pitches and generate investment memos instantly.
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Input Section */}
          <Card className="p-6 space-y-6 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <FileText className="w-5 h-5 text-primary" />
              <h2>Startup Pitch Input</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Written Pitch</label>
                <Textarea
                  value={pitchText}
                  onChange={(e) => setPitchText(e.target.value)}
                  placeholder="Paste your startup pitch here... Describe the problem, solution, market, traction, and business model."
                  className="min-h-[200px] resize-none"
                />
              </div>

              <div className="relative">
                <div className="text-center text-sm text-muted-foreground mb-2">OR</div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Upload Pitch Deck (PDF)</label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {pdfFile ? pdfFile.name : "Click to upload PDF"}
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
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing with Gemini...
                  </>
                ) : (
                  "Generate Analysis"
                )}
              </Button>
            </div>
          </Card>

          {/* Results Section */}
          <Card className="p-6 space-y-6 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <BarChart className="w-5 h-5 text-primary" />
              <h2>Analysis Results</h2>
            </div>

            {!result && !isAnalyzing && (
              <div className="flex flex-col items-center justify-center h-[400px] text-center text-muted-foreground">
                <BarChart className="w-16 h-16 mb-4 opacity-20" />
                <p>Your investment memo and scorecard will appear here</p>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center h-[400px]">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Analyzing with Gemini AI...</p>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-primary">VC Scorecard</h3>
                  <div className="space-y-4">
                    <ScoreBar label="Team" score={result.scorecard.team} />
                    <ScoreBar label="Market Size" score={result.scorecard.marketSize} />
                    <ScoreBar label="Product" score={result.scorecard.product} />
                    <ScoreBar label="Traction" score={result.scorecard.traction} />
                    <ScoreBar label="Business Model" score={result.scorecard.businessModel} />
                    <ScoreBar label="Defensibility" score={result.scorecard.defensibility} />
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Investment Memo */}
        {result && (
          <Card className="p-6 shadow-[var(--shadow-card)]">
            <h3 className="text-lg font-semibold mb-4 text-primary">Investment Memo</h3>
            <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
              {result.memo}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
