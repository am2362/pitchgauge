import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppNavbar from "@/components/AppNavbar";
import { usePageMeta } from "@/hooks/usePageMeta";
import logo from "@/assets/logo.png";

const categories = [
  {
    name: "Team Quality",
    ranges: [
      { range: "1–3", label: "Critical", description: "No info, inexperienced, or red flags (e.g., solo founder with no relevant background).", color: "destructive" as const },
      { range: "4–6", label: "Mediocre", description: "Basic info, some experience but gaps (e.g., technical but no business/sales).", color: "secondary" as const },
      { range: "7–8", label: "Strong", description: "Proven founders (prior exits, domain expertise, complementary skills).", color: "default" as const },
      { range: "9–10", label: "Outstanding", description: "Exceptional track record (successful exits, top-tier network).", color: "default" as const },
    ],
  },
  {
    name: "Market Size",
    ranges: [
      { range: "1–3", label: "Critical", description: "Tiny/niche TAM (<$500M), shrinking, or undefined.", color: "destructive" as const },
      { range: "4–6", label: "Mediocre", description: "Decent but limited ($1B–$10B), slow growth or unclear path.", color: "secondary" as const },
      { range: "7–8", label: "Strong", description: "Large/growing ($10B+ TAM, strong trends).", color: "default" as const },
      { range: "9–10", label: "Outstanding", description: "Massive/expansive ($50B+ with tailwinds).", color: "default" as const },
    ],
  },
  {
    name: "Product Differentiation",
    ranges: [
      { range: "1–3", label: "Critical", description: "Generic/commodity, no moat.", color: "destructive" as const },
      { range: "4–6", label: "Mediocre", description: "Some features but easily replicable.", color: "secondary" as const },
      { range: "7–8", label: "Strong", description: "Clear unique value/tech/IP/brand.", color: "default" as const },
      { range: "9–10", label: "Outstanding", description: "Defensible moat (patents, network effects, first-mover).", color: "default" as const },
    ],
  },
  {
    name: "Traction",
    ranges: [
      { range: "1–3", label: "Critical", description: "None or anecdotal.", color: "destructive" as const },
      { range: "4–6", label: "Mediocre", description: "Early signals (small users/revenue, but not scaling).", color: "secondary" as const },
      { range: "7–8", label: "Strong", description: "Strong metrics (growing revenue/users, retention).", color: "default" as const },
      { range: "9–10", label: "Outstanding", description: "Explosive/validated PMF.", color: "default" as const },
    ],
  },
  {
    name: "Business Model",
    ranges: [
      { range: "1–3", label: "Critical", description: "Unclear, low-margin, unsustainable.", color: "destructive" as const },
      { range: "4–6", label: "Mediocre", description: "Viable but thin margins/challenges.", color: "secondary" as const },
      { range: "7–8", label: "Strong", description: "Scalable, high-margin potential.", color: "default" as const },
      { range: "9–10", label: "Outstanding", description: "Proven, recurring, capital-efficient.", color: "default" as const },
    ],
  },
  {
    name: "Competitive Landscape",
    ranges: [
      { range: "1–3", label: "Critical", description: "Saturated, no barriers.", color: "destructive" as const },
      { range: "4–6", label: "Mediocre", description: "Competitive but some edge.", color: "secondary" as const },
      { range: "7–8", label: "Strong", description: "Differentiated position.", color: "default" as const },
      { range: "9–10", label: "Outstanding", description: "Minimal direct competition or dominant potential.", color: "default" as const },
    ],
  },
];

const ScoringRubric = () => {
  usePageMeta("Scoring Methodology | PitchGauge", "Understand how PitchGauge scores startup pitches across six key criteria.");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <AppNavbar />
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-end gap-2 mb-8">
          <img src={logo} alt="PitchGauge" className="h-6 w-6" />
          <h1 className="text-3xl font-bold text-foreground">Scoring Rubric</h1>
        </div>

        <Card className="p-6 mb-8 bg-card border-border">
          <h2 className="text-xl font-semibold text-foreground mb-3">General Scale (1–10)</h2>
          <p className="text-muted-foreground mb-4">
            All scores are integers from 1 to 10. Every score includes reasoning explaining the exact value (e.g., why 5 not 6).
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { range: "1–3", label: "Critical", desc: "Fatal flaw, high risk of failure", className: "border-destructive/50 bg-destructive/5" },
              { range: "4–6", label: "Mediocre", desc: "Uncompelling, needs major fixes", className: "border-orange-500/50 bg-orange-500/5" },
              { range: "7–8", label: "Strong", desc: "Attractive, competitive", className: "border-blue-500/50 bg-blue-500/5" },
              { range: "9–10", label: "Outstanding", desc: "Top decile, clear advantage", className: "border-green-500/50 bg-green-500/5" },
            ].map((item) => (
              <div key={item.range} className={`rounded-lg border p-4 ${item.className}`}>
                <div className="font-bold text-foreground text-lg">{item.range}</div>
                <div className="font-medium text-foreground">{item.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          {categories.map((category) => (
            <Card key={category.name} className="p-6 bg-card border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">{category.name}</h3>
              <div className="space-y-2">
                {category.ranges.map((r) => (
                  <div key={r.range} className="flex items-start gap-3">
                    <Badge variant={r.color} className="mt-0.5 min-w-[3.5rem] justify-center text-xs">
                      {r.range}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{r.description}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScoringRubric;
