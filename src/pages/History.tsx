import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { ArrowLeft, Trash2, Edit, FileDown, Loader2, Search, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { exportAnalysisToPDF, exportComparisonToPDF } from "@/lib/pdf-export";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ComparisonHistory {
  id: string;
  created_at: string;
  startup_names: string[];
  pitches: any;
  analyses: any;
  comparison_insights: any;
}

interface AnalysisHistory {
  id: string;
  created_at: string;
  startup_name: string;
  pitch_text: string;
  scorecard: any;
  memo: string;
  red_flags: any;
  follow_up_questions: any;
  investment_thesis: string;
  benchmarking: any;
}

export default function History() {
  const [user, setUser] = useState<User | null>(null);
  const [comparisons, setComparisons] = useState<ComparisonHistory[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<"comparison" | "analysis" | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadHistory(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadHistory(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadHistory = async (userId: string) => {
    setLoading(true);
    try {
      const [comparisonsRes, analysesRes] = await Promise.all([
        supabase
          .from("comparison_analyses")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("startup_analyses")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (comparisonsRes.error) throw comparisonsRes.error;
      if (analysesRes.error) throw analysesRes.error;

      setComparisons(comparisonsRes.data || []);
      setAnalyses(analysesRes.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !deleteType || !user) return;

    try {
      const table = deleteType === "comparison" ? "comparison_analyses" : "startup_analyses";
      const { error } = await supabase.from(table).delete().eq("id", deleteId);

      if (error) throw error;

      if (deleteType === "comparison") {
        setComparisons(comparisons.filter(c => c.id !== deleteId));
      } else {
        setAnalyses(analyses.filter(a => a.id !== deleteId));
      }

      toast({
        title: "Deleted",
        description: `${deleteType === "comparison" ? "Comparison" : "Analysis"} deleted successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
      setDeleteType(null);
    }
  };

  const exportComparison = (comparison: ComparisonHistory) => {
    exportComparisonToPDF({
      startupNames: comparison.startup_names,
      analyses: comparison.analyses,
      comparisonInsights: comparison.comparison_insights,
    });
  };

  const exportAnalysis = (analysis: AnalysisHistory) => {
    const analysisData: any = {
      memo: analysis.memo,
      scorecard: analysis.scorecard,
      redFlags: analysis.red_flags,
      followUpQuestions: analysis.follow_up_questions,
      benchmarking: analysis.benchmarking,
    };
    
    // Parse investment_thesis if it's a JSON string
    if (analysis.investment_thesis) {
      try {
        analysisData.investmentThesis = typeof analysis.investment_thesis === 'string'
          ? JSON.parse(analysis.investment_thesis)
          : analysis.investment_thesis;
      } catch {
        // If it's not valid JSON, skip it
      }
    }
    
    exportAnalysisToPDF(analysisData, analysis.startup_name);
  };

  const filteredComparisons = comparisons
    .filter(c => 
      searchTerm === "" || 
      c.startup_names.some(name => name && name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return a.startup_names[0].localeCompare(b.startup_names[0]);
      }
    });

  const filteredAnalyses = analyses
    .filter(a => 
      searchTerm === "" || 
      (a.startup_name && a.startup_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        const nameA = a.startup_name || "";
        const nameB = b.startup_name || "";
        return nameA.localeCompare(nameB);
      }
    });

  const getAverageScore = (scorecard: any) => {
    if (!scorecard) return 0;
    const scores = Object.values(scorecard).map((item: any) => item.score);
    return (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Analysis History
              </h1>
              <p className="text-muted-foreground mt-1">View and manage your saved analyses</p>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by startup name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Select value={sortBy} onValueChange={(value: "date" | "name") => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing {filteredComparisons.length} comparison{filteredComparisons.length !== 1 ? 's' : ''} and {filteredAnalyses.length} analysis{filteredAnalyses.length !== 1 ? 'es' : ''} matching "{searchTerm}"
            </p>
          )}
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="comparisons" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="comparisons">
                Comparisons ({filteredComparisons.length})
              </TabsTrigger>
              <TabsTrigger value="analyses">
                Analyses ({filteredAnalyses.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comparisons" className="space-y-4">
              {filteredComparisons.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {searchTerm ? `No comparisons found matching "${searchTerm}"` : "No saved comparisons found"}
                  </p>
                  {searchTerm && (
                    <Button variant="outline" onClick={() => setSearchTerm("")} className="mt-4">
                      Clear Search
                    </Button>
                  )}
                </Card>
              ) : (
                filteredComparisons.map((comparison) => (
                  <Card key={comparison.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {comparison.startup_names.map((name, idx) => (
                            <Badge key={idx} variant="secondary">
                              {name}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(comparison.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {comparison.comparison_insights?.recommendation && (
                          <p className="mt-2 text-sm">
                            <span className="font-semibold">Recommendation:</span>{" "}
                            {comparison.comparison_insights.recommendation.slice(0, 150)}...
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => exportComparison(comparison)}
                          title="Export to PDF"
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setDeleteId(comparison.id);
                            setDeleteType("comparison");
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="analyses" className="space-y-4">
              {filteredAnalyses.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {searchTerm ? `No analyses found matching "${searchTerm}"` : "No saved analyses found"}
                  </p>
                  {searchTerm && (
                    <Button variant="outline" onClick={() => setSearchTerm("")} className="mt-4">
                      Clear Search
                    </Button>
                  )}
                </Card>
              ) : (
                filteredAnalyses.map((analysis) => (
                  <Card key={analysis.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{analysis.startup_name || "Unnamed Startup"}</h3>
                          <Badge variant="outline">
                            Score: {getAverageScore(analysis.scorecard)}/10
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {new Date(analysis.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="text-sm line-clamp-2">
                          {analysis.pitch_text.slice(0, 200)}...
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => exportAnalysis(analysis)}
                          title="Export to PDF"
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setDeleteId(analysis.id);
                            setDeleteType("analysis");
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {deleteType === "comparison" ? "comparison" : "analysis"}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
