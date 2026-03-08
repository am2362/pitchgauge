import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, Lock, ArrowRight, Download, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DEMO_BULK_RESULTS, DEMO_BULK_COMPARISON_REPORT } from "@/lib/demo-data";
import { DemoBanner } from "@/components/DemoBanner";
import { DemoNav } from "@/components/DemoNav";
import { InvestmentRankingsTable } from "@/components/bulk/InvestmentRankingsTable";
import { SectorBreakdownChart } from "@/components/bulk/SectorBreakdownChart";
import ExcelJS from "exceljs";

type BulkStep = { msg: string; duration: number };

const BULK_STEPS: BulkStep[] = [
  { msg: "Uploading Excel file...", duration: 1000 },
  { msg: "Reading 10 startups...", duration: 1000 },
  { msg: "Analysing startups...", duration: 3000 },
  { msg: "Generating report...", duration: 1000 },
];

const DemoBulk = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleLoadDemo = () => {
    setLoading(true);
    setStepIndex(0);
    setShowResults(false);
    setAnalysisProgress(0);
  };

  useEffect(() => {
    if (!loading || stepIndex < 0) return;
    if (stepIndex >= BULK_STEPS.length) {
      setLoading(false);
      setShowResults(true);
      return;
    }

    // For step 2 (analysing), animate progress bar
    if (stepIndex === 2) {
      setAnalysisProgress(0);
      const interval = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 100) return 100;
          return prev + 3.33;
        });
      }, 100);
      progressRef.current = interval;

      const timer = setTimeout(() => {
        clearInterval(interval);
        progressRef.current = null;
        setAnalysisProgress(100);
        setStepIndex((i) => i + 1);
      }, BULK_STEPS[stepIndex].duration);

      return () => {
        clearTimeout(timer);
        if (progressRef.current) clearInterval(progressRef.current);
      };
    }

    const timer = setTimeout(() => {
      setStepIndex((i) => i + 1);
    }, BULK_STEPS[stepIndex].duration);
    return () => clearTimeout(timer);
  }, [loading, stepIndex]);

  const handleSignupPrompt = () => {
    toast({ title: "Demo Mode", description: "Sign up for a free account to access this feature!" });
  };

  const handleExcelDownload = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Startup Rankings");

    sheet.columns = [
      { header: "Rank", key: "rank", width: 8 },
      { header: "Startup Name", key: "name", width: 20 },
      { header: "Sector", key: "sector", width: 18 },
      { header: "Team Quality", key: "team", width: 14 },
      { header: "Market Size", key: "market", width: 14 },
      { header: "Product Differentiation", key: "product", width: 22 },
      { header: "Traction", key: "traction", width: 12 },
      { header: "Business Model", key: "businessModel", width: 16 },
      { header: "Competitive Landscape", key: "competitive", width: 22 },
      { header: "Overall Score", key: "overall", width: 14 },
    ];

    // Header styling
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
    });

    DEMO_BULK_RESULTS.forEach((r, idx) => {
      sheet.addRow({
        rank: idx + 1,
        name: r.startupName,
        sector: r.sector,
        team: r.scores.team,
        market: r.scores.market,
        product: r.scores.product,
        traction: r.scores.traction,
        businessModel: r.scores.businessModel,
        competitive: r.scores.funding,
        overall: r.scores.overall,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "demo_startup_rankings.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <DemoBanner />
      <DemoNav />

      <div className="container max-w-7xl mx-auto px-4 py-8">
        <header className="text-center mb-8 space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Bulk Startup Analysis</h1>
          <p className="text-muted-foreground">Upload an Excel file of startups and get ranked results</p>
        </header>

        {!showResults && !loading && (
          <div className="text-center">
            <Card className="max-w-lg mx-auto p-8">
              <FileSpreadsheet className="h-10 w-10 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2 text-foreground">Load Demo Excel</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Simulates uploading an Excel file with 10 startups across different sectors
              </p>
              <Button size="lg" onClick={handleLoadDemo} className="gap-2">
                Load Demo Excel <ArrowRight className="h-4 w-4" />
              </Button>
            </Card>
          </div>
        )}

        {loading && stepIndex >= 0 && stepIndex < BULK_STEPS.length && (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Processing
              </CardTitle>
              <CardDescription>Analysing your startup batch</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show fake file */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">startups_batch_demo.xlsx</p>
                  <p className="text-xs text-muted-foreground">10 startups</p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {BULK_STEPS.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {idx < stepIndex ? (
                      <span className="text-green-500 text-sm">✓</span>
                    ) : idx === stepIndex ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-border" />
                    )}
                    <span className={`text-sm ${idx <= stepIndex ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {step.msg}
                    </span>
                  </div>
                ))}
              </div>

              {stepIndex === 2 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{Math.min(Math.round(analysisProgress / 10), 10)} of 10 startups</span>
                    <span>{Math.round(Math.min(analysisProgress, 100))}%</span>
                  </div>
                  <Progress value={Math.min(analysisProgress, 100)} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {showResults && (
          <div className="space-y-8 animate-fade-in">
            {/* Action bar */}
            <div className="flex justify-end gap-3">
              <Button onClick={handleExcelDownload} variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Download Excel Results
              </Button>
              <Button variant="outline" onClick={handleSignupPrompt} className="gap-1">
                <Lock className="h-3 w-3" /> Export PDF
              </Button>
            </div>

            {/* Rankings */}
            <InvestmentRankingsTable rankings={DEMO_BULK_COMPARISON_REPORT.investmentRankings} />

            {/* Sector chart */}
            <SectorBreakdownChart sectorBreakdown={DEMO_BULK_COMPARISON_REPORT.sectorBreakdown} />

            {/* Recommendation */}
            <Card className="p-6 border-primary/30 bg-primary/5">
              <h2 className="text-xl font-bold mb-3 text-foreground">Overall Recommendation</h2>
              <p className="text-muted-foreground leading-relaxed">{DEMO_BULK_COMPARISON_REPORT.overallRecommendation}</p>
            </Card>

            {/* Bottom CTA */}
            <Card className="p-8 text-center border-primary/30 bg-primary/5">
              <h3 className="text-2xl font-bold text-foreground mb-2">Bulk-analyze your own deal flow</h3>
              <p className="text-muted-foreground mb-6">Upload up to 100 startups and get ranked investment recommendations</p>
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

export default DemoBulk;
