import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-external";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Trash2, FileDown, Loader2, Search, Filter, X, Eye, Lock } from "lucide-react";
import AppNavbar from "@/components/AppNavbar";
import { useSubscription } from "@/hooks/useSubscription";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { exportAnalysisToPDF, exportComparisonToPDF } from "@/lib/pdf-export";
import { exportBulkAnalysisToExcel } from "@/lib/bulk-excel-export";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { usePageMeta } from "@/hooks/usePageMeta";

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

interface BulkAnalysisHistory {
  id: string;
  created_at: string;
  batch_name: string;
  total_startups: number;
  completed_startups: number;
  status: string;
  results: any;
  comparison_report: any;
}

export default function History() {
  usePageMeta("PitchGauge", "Browse and manage your past startup pitch analyses.");
  const [user, setUser] = useState<User | null>(null);
  const [comparisons, setComparisons] = useState<ComparisonHistory[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisHistory[]>([]);
  const [bulkAnalyses, setBulkAnalyses] = useState<BulkAnalysisHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<"comparison" | "analysis" | "bulk" | null>(null);
  const [viewAnalysis, setViewAnalysis] = useState<AnalysisHistory | null>(null);
  const [viewComparison, setViewComparison] = useState<ComparisonHistory | null>(null);
  const [viewBulk, setViewBulk] = useState<BulkAnalysisHistory | null>(null);
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
      const [comparisonsRes, analysesRes, bulkRes] = await Promise.all([
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
        supabase
          .from("bulk_analyses")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (comparisonsRes.error) throw comparisonsRes.error;
      if (analysesRes.error) throw analysesRes.error;
      if (bulkRes.error) throw bulkRes.error;

      setComparisons(comparisonsRes.data || []);
      setAnalyses(analysesRes.data || []);
      setBulkAnalyses(bulkRes.data || []);
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
      const table = deleteType === "comparison" ? "comparison_analyses" : deleteType === "bulk" ? "bulk_analyses" : "startup_analyses";
      const { error } = await supabase.from(table).delete().eq("id", deleteId);

      if (error) throw error;

      if (deleteType === "comparison") {
        setComparisons(comparisons.filter(c => c.id !== deleteId));
      } else if (deleteType === "bulk") {
        setBulkAnalyses(bulkAnalyses.filter(b => b.id !== deleteId));
      } else {
        setAnalyses(analyses.filter(a => a.id !== deleteId));
      }

      toast({ title: "Deleted", description: "Item deleted successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" });
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
    if (analysis.investment_thesis) {
      try {
        analysisData.investmentThesis = typeof analysis.investment_thesis === 'string'
          ? JSON.parse(analysis.investment_thesis)
          : analysis.investment_thesis;
      } catch { /* skip */ }
    }
    exportAnalysisToPDF(analysisData, analysis.startup_name);
  };

  const exportBulk = async (bulk: BulkAnalysisHistory) => {
    try {
      await exportBulkAnalysisToExcel(bulk.results || [], bulk.comparison_report || null, bulk.batch_name);
    } catch (error: any) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    }
  };

  const getAverageScore = (scorecard: any) => {
    if (!scorecard) return 0;
    const scores = Object.values(scorecard).map((item: any) => item.score);
    return Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 dark:text-green-400";
    if (score >= 6) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

  const filteredComparisons = comparisons
    .filter(c => searchTerm === "" || c.startup_names.some(name => name?.toLowerCase().includes(searchTerm.toLowerCase())))
    .sort((a, b) => sortBy === "date" ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : a.startup_names[0].localeCompare(b.startup_names[0]));

  const filteredAnalyses = analyses
    .filter(a => {
      if (searchTerm === "") return true;
      const s = searchTerm.toLowerCase();
      return (a.startup_name?.toLowerCase().includes(s)) || (a.pitch_text?.toLowerCase().includes(s));
    })
    .sort((a, b) => sortBy === "date" ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : (a.startup_name || "").localeCompare(b.startup_name || ""));

  const filteredBulk = bulkAnalyses
    .filter(b => searchTerm === "" || b.batch_name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => sortBy === "date" ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : a.batch_name.localeCompare(b.batch_name));

  const { tier, startCheckout } = useSubscription();
  const FREE_LIMIT = 5;
  const PAGE_SIZE = 20;
  const [analysisPage, setAnalysisPage] = useState(1);
  const [comparisonPage, setComparisonPage] = useState(1);
  const [bulkPage, setBulkPage] = useState(1);

  const isFree = tier === "free";

  const paginate = <T,>(items: T[], page: number): T[] => {
    if (isFree) return items.slice(0, FREE_LIMIT);
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  };

  const totalPages = (count: number) => Math.max(1, Math.ceil(count / PAGE_SIZE));

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <AppNavbar />
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Analysis History
          </h1>
          <p className="text-muted-foreground mt-1">View and manage your saved analyses</p>
        </div>

        {/* Search and Filter */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by startup name, batch name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")} className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0">
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
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="analyses" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="analyses">Analyses ({filteredAnalyses.length})</TabsTrigger>
              <TabsTrigger value="comparisons">Comparisons ({filteredComparisons.length})</TabsTrigger>
              <TabsTrigger value="bulk">Bulk ({filteredBulk.length})</TabsTrigger>
            </TabsList>

            {/* SINGLE ANALYSES TAB */}
            <TabsContent value="analyses" className="space-y-4">
              {filteredAnalyses.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">{searchTerm ? `No analyses found matching "${searchTerm}"` : "No saved analyses found"}</p>
                </Card>
              ) : (
                <>
                  {paginate(filteredAnalyses, analysisPage).map((analysis) => (
                    <Card key={analysis.id} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">Single</Badge>
                            <h3 className="text-lg font-semibold">{analysis.startup_name || "Unnamed Startup"}</h3>
                            <Badge variant="outline">Score: {getAverageScore(analysis.scorecard)}/10</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{formatDate(analysis.created_at)}</p>
                          <p className="text-sm line-clamp-2">{analysis.pitch_text?.slice(0, 200)}...</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button variant="outline" size="icon" onClick={() => setViewAnalysis(analysis)} title="View"><Eye className="h-4 w-4" /></Button>
                          <Button variant="outline" size="icon" onClick={() => exportAnalysis(analysis)} title="Export PDF"><FileDown className="h-4 w-4" /></Button>
                          <Button variant="outline" size="icon" onClick={() => { setDeleteId(analysis.id); setDeleteType("analysis"); }} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {isFree && filteredAnalyses.length > FREE_LIMIT && (
                    <div className="relative mt-4">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background z-10 flex items-end justify-center pb-6">
                        <Card className="p-6 text-center shadow-lg">
                          <Lock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="font-semibold mb-2">Upgrade for full history</p>
                          <p className="text-sm text-muted-foreground mb-4">{filteredAnalyses.length - FREE_LIMIT} more items hidden</p>
                          <Button onClick={() => startCheckout("pro")}>Upgrade to Pro</Button>
                        </Card>
                      </div>
                      <div className="blur-sm pointer-events-none space-y-4">
                        {filteredAnalyses.slice(FREE_LIMIT, FREE_LIMIT + 3).map((a) => (
                          <Card key={a.id} className="p-6"><h3 className="text-lg font-semibold">{a.startup_name || "Unnamed"}</h3></Card>
                        ))}
                      </div>
                    </div>
                  )}
                  {!isFree && filteredAnalyses.length > PAGE_SIZE && (
                    <Pagination className="mt-4">
                      <PaginationContent>
                        <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setAnalysisPage(p => Math.max(1, p - 1)); }} /></PaginationItem>
                        {Array.from({ length: totalPages(filteredAnalyses.length) }, (_, i) => (
                          <PaginationItem key={i}><PaginationLink href="#" isActive={analysisPage === i + 1} onClick={(e) => { e.preventDefault(); setAnalysisPage(i + 1); }}>{i + 1}</PaginationLink></PaginationItem>
                        ))}
                        <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setAnalysisPage(p => Math.min(totalPages(filteredAnalyses.length), p + 1)); }} /></PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </TabsContent>

            {/* COMPARISONS TAB */}
            <TabsContent value="comparisons" className="space-y-4">
              {filteredComparisons.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">{searchTerm ? `No comparisons found matching "${searchTerm}"` : "No saved comparisons found"}</p>
                </Card>
              ) : (
                <>
                  {paginate(filteredComparisons, comparisonPage).map((comparison) => (
                    <Card key={comparison.id} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">Comparison</Badge>
                            {comparison.startup_names.map((name, idx) => (
                              <Badge key={idx} variant="secondary">{name}</Badge>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground">{formatDate(comparison.created_at)}</p>
                          {comparison.comparison_insights?.recommendation && (
                            <p className="mt-2 text-sm"><span className="font-semibold">Recommendation:</span> {comparison.comparison_insights.recommendation.slice(0, 150)}...</p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button variant="outline" size="icon" onClick={() => setViewComparison(comparison)} title="View"><Eye className="h-4 w-4" /></Button>
                          <Button variant="outline" size="icon" onClick={() => exportComparison(comparison)} title="Export PDF"><FileDown className="h-4 w-4" /></Button>
                          <Button variant="outline" size="icon" onClick={() => { setDeleteId(comparison.id); setDeleteType("comparison"); }} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {isFree && filteredComparisons.length > FREE_LIMIT && (
                    <div className="relative mt-4">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background z-10 flex items-end justify-center pb-6">
                        <Card className="p-6 text-center shadow-lg"><Lock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" /><p className="font-semibold mb-2">Upgrade for full history</p><Button onClick={() => startCheckout("pro")}>Upgrade to Pro</Button></Card>
                      </div>
                      <div className="blur-sm pointer-events-none space-y-4">
                        {filteredComparisons.slice(FREE_LIMIT, FREE_LIMIT + 2).map((c) => (<Card key={c.id} className="p-6"><p className="text-sm text-muted-foreground">{formatDate(c.created_at)}</p></Card>))}
                      </div>
                    </div>
                  )}
                  {!isFree && filteredComparisons.length > PAGE_SIZE && (
                    <Pagination className="mt-4">
                      <PaginationContent>
                        <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setComparisonPage(p => Math.max(1, p - 1)); }} /></PaginationItem>
                        {Array.from({ length: totalPages(filteredComparisons.length) }, (_, i) => (
                          <PaginationItem key={i}><PaginationLink href="#" isActive={comparisonPage === i + 1} onClick={(e) => { e.preventDefault(); setComparisonPage(i + 1); }}>{i + 1}</PaginationLink></PaginationItem>
                        ))}
                        <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setComparisonPage(p => Math.min(totalPages(filteredComparisons.length), p + 1)); }} /></PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </TabsContent>

            {/* BULK ANALYSES TAB */}
            <TabsContent value="bulk" className="space-y-4">
              {filteredBulk.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">{searchTerm ? `No bulk analyses found matching "${searchTerm}"` : "No bulk analyses found"}</p>
                </Card>
              ) : (
                <>
                  {paginate(filteredBulk, bulkPage).map((bulk) => (
                    <Card key={bulk.id} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">Bulk</Badge>
                            <h3 className="text-lg font-semibold">{bulk.batch_name}</h3>
                            <Badge variant={bulk.status === "completed" ? "default" : bulk.status === "failed" ? "destructive" : "secondary"}>{bulk.status}</Badge>
                            <Badge variant="outline">{bulk.completed_startups}/{bulk.total_startups} startups</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{formatDate(bulk.created_at)}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button variant="outline" size="icon" onClick={() => setViewBulk(bulk)} title="View"><Eye className="h-4 w-4" /></Button>
                          <Button variant="outline" size="icon" onClick={() => exportBulk(bulk)} title="Export Excel"><FileDown className="h-4 w-4" /></Button>
                          <Button variant="outline" size="icon" onClick={() => { setDeleteId(bulk.id); setDeleteType("bulk"); }} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {isFree && filteredBulk.length > FREE_LIMIT && (
                    <div className="relative mt-4">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background z-10 flex items-end justify-center pb-6">
                        <Card className="p-6 text-center shadow-lg"><Lock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" /><p className="font-semibold mb-2">Upgrade for full history</p><Button onClick={() => startCheckout("pro")}>Upgrade to Pro</Button></Card>
                      </div>
                      <div className="blur-sm pointer-events-none space-y-4">
                        {filteredBulk.slice(FREE_LIMIT, FREE_LIMIT + 2).map((b) => (<Card key={b.id} className="p-6"><p className="text-sm text-muted-foreground">{formatDate(b.created_at)}</p></Card>))}
                      </div>
                    </div>
                  )}
                  {!isFree && filteredBulk.length > PAGE_SIZE && (
                    <Pagination className="mt-4">
                      <PaginationContent>
                        <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setBulkPage(p => Math.max(1, p - 1)); }} /></PaginationItem>
                        {Array.from({ length: totalPages(filteredBulk.length) }, (_, i) => (
                          <PaginationItem key={i}><PaginationLink href="#" isActive={bulkPage === i + 1} onClick={(e) => { e.preventDefault(); setBulkPage(i + 1); }}>{i + 1}</PaginationLink></PaginationItem>
                        ))}
                        <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setBulkPage(p => Math.min(totalPages(filteredBulk.length), p + 1)); }} /></PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* DELETE DIALOG */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this item. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* VIEW SINGLE ANALYSIS DIALOG */}
      <Dialog open={!!viewAnalysis} onOpenChange={(open) => !open && setViewAnalysis(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{viewAnalysis?.startup_name || "Analysis Details"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {viewAnalysis && <AnalysisDetailView analysis={viewAnalysis} getScoreColor={getScoreColor} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* VIEW COMPARISON DIALOG */}
      <Dialog open={!!viewComparison} onOpenChange={(open) => !open && setViewComparison(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Comparison: {viewComparison?.startup_names.join(" vs ")}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {viewComparison && <ComparisonDetailView comparison={viewComparison} getScoreColor={getScoreColor} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* VIEW BULK DIALOG */}
      <Dialog open={!!viewBulk} onOpenChange={(open) => !open && setViewBulk(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Bulk Analysis: {viewBulk?.batch_name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {viewBulk && <BulkDetailView bulk={viewBulk} getScoreColor={getScoreColor} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============ SUB-COMPONENTS ============ */

function AnalysisDetailView({ analysis, getScoreColor }: { analysis: AnalysisHistory; getScoreColor: (s: number) => string }) {
  const scorecard = analysis.scorecard;
  const scorecardKeys = scorecard ? Object.keys(scorecard) : [];

  let investmentThesis: any = null;
  if (analysis.investment_thesis) {
    try {
      investmentThesis = typeof analysis.investment_thesis === 'string' ? JSON.parse(analysis.investment_thesis) : analysis.investment_thesis;
    } catch { /* skip */ }
  }

  return (
    <div className="space-y-6">
      {/* Scorecard */}
      {scorecard && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Scorecard</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scorecardKeys.map((key) => {
              const item = scorecard[key];
              const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase());
              return (
                <Card key={key} className="p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm">{label}</span>
                    <span className={`font-bold ${getScoreColor(item.score)}`}>{item.score}/10</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.reasoning}</p>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Memo */}
      {analysis.memo && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Memo</h3>
          <p className="text-sm whitespace-pre-wrap">{typeof analysis.memo === 'string' ? analysis.memo : JSON.stringify(analysis.memo, null, 2)}</p>
        </div>
      )}

      {/* Red Flags */}
      {analysis.red_flags && Array.isArray(analysis.red_flags) && analysis.red_flags.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Red Flags</h3>
          <div className="space-y-2">
            {(analysis.red_flags as any[]).map((flag: any, i: number) => (
              <Card key={i} className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={flag.severity === "high" ? "destructive" : "secondary"}>{flag.severity}</Badge>
                  <span className="font-medium text-sm">{flag.issue}</span>
                </div>
                <p className="text-xs text-muted-foreground">{flag.explanation}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Questions */}
      {analysis.follow_up_questions && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Follow-up Questions</h3>
          {Object.entries(analysis.follow_up_questions as Record<string, string[]>).map(([cat, questions]) => (
            <div key={cat} className="mb-2">
              <p className="font-medium text-sm capitalize">{cat.replace(/([A-Z])/g, " $1")}</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {(questions as string[]).map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Investment Thesis */}
      {investmentThesis && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Investment Thesis</h3>
          {investmentThesis.bullCase && (
            <div className="mb-2">
              <p className="font-medium text-sm text-green-600 dark:text-green-400">Bull Case</p>
              <p className="text-sm">{investmentThesis.bullCase}</p>
            </div>
          )}
          {investmentThesis.bearCase && (
            <div>
              <p className="font-medium text-sm text-red-600 dark:text-red-400">Bear Case</p>
              <p className="text-sm">{investmentThesis.bearCase}</p>
            </div>
          )}
        </div>
      )}

      {/* Benchmarking */}
      {analysis.benchmarking && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Benchmarking</h3>
          <p className="text-sm">{typeof analysis.benchmarking === 'string' ? analysis.benchmarking : JSON.stringify(analysis.benchmarking, null, 2)}</p>
        </div>
      )}
    </div>
  );
}

function ComparisonDetailView({ comparison, getScoreColor }: { comparison: ComparisonHistory; getScoreColor: (s: number) => string }) {
  const analyses = comparison.analyses as any[];
  const insights = comparison.comparison_insights;
  const scorecardKeys = ["team", "marketSize", "traction", "productDifferentiation", "businessModel", "competitiveLandscape"];

  return (
    <div className="space-y-6">
      {/* Rankings */}
      {insights?.rankings && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Investment Rankings</h3>
          <div className="space-y-2">
            {(insights.rankings as any[]).map((r: any, i: number) => (
              <Card key={i} className="p-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-primary">#{r.rank || i + 1}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{r.startupName}</p>
                    <p className="text-sm text-muted-foreground">{r.reasoning || r.recommendation}</p>
                  </div>
                  {r.overallScore && <Badge variant="outline" className="text-lg">{r.overallScore}/10</Badge>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Overall Recommendation */}
      {insights?.recommendation && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Overall Recommendation</h3>
          <p className="text-sm">{insights.recommendation}</p>
        </div>
      )}

      {/* Comparative Insights */}
      {insights?.comparativeInsights && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Comparative Insights</h3>
          <p className="text-sm">{insights.comparativeInsights}</p>
        </div>
      )}

      {/* Score Comparison Table */}
      {analyses && analyses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Detailed Score Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Metric</th>
                  {comparison.startup_names.map((name, i) => (
                    <th key={i} className="text-center p-2">{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scorecardKeys.map((key) => {
                  const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase());
                  const scores = analyses.map((a: any) => a?.scorecard?.[key]?.score ?? 0);
                  const maxScore = Math.max(...scores);
                  return (
                    <tr key={key} className="border-b">
                      <td className="p-2 font-medium">{label}</td>
                      {analyses.map((a: any, i: number) => {
                        const score = a?.scorecard?.[key]?.score ?? 0;
                        return (
                          <td key={i} className="text-center p-2">
                            <span className={`font-bold ${getScoreColor(score)} ${score === maxScore && scores.filter(s => s === maxScore).length === 1 ? 'underline' : ''}`}>
                              {score}/10
                            </span>
                            {a?.scorecard?.[key]?.reasoning && (
                              <p className="text-xs text-muted-foreground mt-1">{a.scorecard[key].reasoning}</p>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {/* Overall Score */}
                <tr className="border-t-2 border-primary/30 bg-secondary/20">
                  <td className="p-2 font-bold">Overall Score</td>
                  {analyses.map((a: any, i: number) => {
                    const avg = scorecardKeys.reduce((sum, k) => sum + (a?.scorecard?.[k]?.score ?? 0), 0) / scorecardKeys.length;
                    const allAvgs = analyses.map((an: any) => scorecardKeys.reduce((s, k) => s + (an?.scorecard?.[k]?.score ?? 0), 0) / scorecardKeys.length);
                    const maxAvg = Math.max(...allAvgs);
                    return (
                      <td key={i} className="text-center p-2">
                        <span className={`text-xl font-bold ${getScoreColor(Math.round(avg))} ${avg === maxAvg && allAvgs.filter(a => a === maxAvg).length === 1 ? 'underline decoration-2' : ''}`}>
                          {avg.toFixed(1)}/10
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Strengths & Weaknesses */}
      {insights?.strengthsWeaknesses && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Key Strengths & Weaknesses</h3>
          {Object.entries(insights.strengthsWeaknesses as Record<string, any>).map(([name, sw]: [string, any]) => (
            <Card key={name} className="p-3 mb-2">
              <p className="font-semibold mb-2">{name}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Strengths</p>
                  <ul className="list-disc list-inside text-xs text-muted-foreground">
                    {(sw.strengths || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Weaknesses</p>
                  <ul className="list-disc list-inside text-xs text-muted-foreground">
                    {(sw.weaknesses || []).map((w: string, i: number) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BulkDetailView({ bulk, getScoreColor }: { bulk: BulkAnalysisHistory; getScoreColor: (s: number) => string }) {
  const results = bulk.results as any[] | null;
  const report = bulk.comparison_report as any | null;

  return (
    <div className="space-y-6">
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Total: {bulk.total_startups} startups</span>
        <span>Completed: {bulk.completed_startups}</span>
        <span>Status: {bulk.status}</span>
      </div>

      {/* Rankings from comparison report */}
      {report?.investmentRankings && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Investment Rankings</h3>
          <div className="space-y-2">
            {(report.investmentRankings as any[]).map((r: any, i: number) => (
              <Card key={i} className="p-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-primary">#{r.rank}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{r.startupName}</p>
                    <p className="text-sm text-muted-foreground">{r.recommendation}</p>
                    {r.topStrengths && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {r.topStrengths.map((s: string, j: number) => <Badge key={j} variant="outline" className="text-xs">{s}</Badge>)}
                      </div>
                    )}
                  </div>
                  <span className={`text-xl font-bold ${getScoreColor(r.overallScore)}`}>{r.overallScore}/10</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Overall Recommendation */}
      {report?.overallRecommendation && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Overall Recommendation</h3>
          <p className="text-sm">{report.overallRecommendation}</p>
        </div>
      )}

      {/* Individual Results Summary */}
      {results && results.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">All Results ({results.length})</h3>
          <div className="space-y-2">
            {results.map((r: any, i: number) => (
              <Card key={i} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.startupName || `Startup ${i + 1}`}</p>
                    <p className="text-xs text-muted-foreground">{r.sector} {r.tags?.length > 0 && `• ${r.tags.join(", ")}`}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.summary}</p>
                  </div>
                  {r.scores?.overall != null && (
                    <span className={`text-lg font-bold ${getScoreColor(r.scores.overall)}`}>{r.scores.overall}/10</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
