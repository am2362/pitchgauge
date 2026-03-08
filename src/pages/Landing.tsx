import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Brain,
  CheckCircle,
  BarChart3,
  GitCompare,
  Layers,
  Shield,
  Users,
  Building2,
  Briefcase,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Sparkles,
  FileText,
  Download,
  Zap,
  Star,
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">PitchGauge</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => scrollTo("how-it-works")} className="hover:text-foreground transition-colors">How It Works</button>
            <button onClick={() => scrollTo("features")} className="hover:text-foreground transition-colors">Features</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => navigate("/scoring-rubric")} className="hover:text-foreground transition-colors">Scoring Guide</button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Log in</Button>
            <Button size="sm" onClick={() => navigate("/auth")}>Get Started</Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="container max-w-6xl mx-auto px-4 pt-20 pb-16 md:pt-32 md:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-medium">
                <Shield className="h-3 w-3" /> Trusted by Investors
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
                Analyze Any Startup Pitch{" "}
                <span className="text-primary">in Minutes</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                Score pitches, compare deal flow, and bulk-process 100 startups at once — powered by AI built for investors.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button size="lg" className="gap-2" onClick={() => navigate("/auth")}>
                  Start for Free <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2" onClick={() => scrollTo("how-it-works")}>
                  See How It Works
                </Button>
              </div>
            </div>

            {/* Mockup */}
            <div className="relative hidden lg:block">
              <div className="rounded-xl border border-border bg-card shadow-elevated overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/50">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                  <div className="w-3 h-3 rounded-full bg-green-400/60" />
                  <span className="ml-3 text-xs text-muted-foreground">pitchgauge.app/dashboard</span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Startup Scorecard</span>
                    <Badge>8.2 / 10</Badge>
                  </div>
                  {[
                    { label: "Team Quality", score: 9 },
                    { label: "Market Size", score: 8 },
                    { label: "Product Differentiation", score: 7 },
                    { label: "Traction", score: 8 },
                    { label: "Business Model", score: 9 },
                    { label: "Competitive Landscape", score: 8 },
                  ].map((m) => (
                    <div key={m.label} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-40 shrink-0">{m.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${m.score * 10}%` }} />
                      </div>
                      <span className="text-xs font-medium w-6 text-right">{m.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="border-y border-border bg-muted/30">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Used by investors analyzing thousands of pitches
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14 opacity-50">
            {[
              { icon: Building2, label: "VC Fund" },
              { icon: Users, label: "Angel Network" },
              { icon: Sparkles, label: "Accelerator" },
              { icon: Briefcase, label: "Family Office" },
              { icon: Shield, label: "Syndicate" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="container max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Three Steps to Smarter Investing</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Upload,
                title: "Upload or Paste Your Pitch",
                desc: "Add a pitch deck PDF or paste your pitch text directly.",
                step: "01",
              },
              {
                icon: Brain,
                title: "AI Scores & Analyzes",
                desc: "Get a full scorecard across 6 investment criteria in seconds.",
                step: "02",
              },
              {
                icon: CheckCircle,
                title: "Decide with Confidence",
                desc: "Download reports, compare deals, and track your history.",
                step: "03",
              },
            ].map(({ icon: Icon, title, desc, step }) => (
              <div key={step} className="relative text-center space-y-4 p-6">
                <span className="text-5xl font-extrabold text-primary/10 absolute top-2 left-6">{step}</span>
                <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-muted/30">
        <div className="container max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything You Need to Evaluate Deal Flow</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: "Single Pitch Analysis",
                desc: "Score any pitch across Team, Market, Product, Traction, Business Model, and Competitive Landscape. Get red flags, questions to ask founders, bull/bear thesis, and benchmark percentile.",
              },
              {
                icon: GitCompare,
                title: "Comparison Mode",
                desc: "Compare up to 5 startups side-by-side. Get ranked investment recommendations with detailed score breakdowns and key strengths/weaknesses per startup.",
              },
              {
                icon: Layers,
                title: "Bulk Analysis",
                desc: "Upload up to 100 startups via Excel. Get top 20 ranked, sector distribution charts, and exportable reports — perfect for batch screening deal flow.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="p-6 hover:shadow-elevated transition-shadow border-border bg-card">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="scroll-mt-20">
        <div className="container max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground mt-3">Start free. Upgrade when you need more power.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                period: "/mo",
                desc: "For casual exploration",
                features: ["3 single analyses/day", "Basic JSON + PDF download", "No history"],
                cta: "Get Started Free",
                highlight: false,
              },
              {
                name: "Pro",
                price: "$19",
                period: "/mo",
                desc: "For active angel investors",
                features: [
                  "Unlimited single analyses",
                  "Comparison mode (up to 5)",
                  "Full download options",
                  "30-day history",
                ],
                cta: "Start Pro Trial",
                highlight: true,
              },
              {
                name: "Scale",
                price: "$49",
                period: "/mo",
                desc: "For funds & accelerators",
                features: [
                  "Everything in Pro",
                  "Bulk analysis (up to 100)",
                  "Sector charts & Excel export",
                  "Unlimited history",
                ],
                cta: "Start Scale Trial",
                highlight: false,
              },
            ].map((tier) => (
              <Card
                key={tier.name}
                className={`relative p-6 flex flex-col border-border bg-card ${
                  tier.highlight ? "ring-2 ring-primary shadow-elevated" : ""
                }`}
              >
                {tier.highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                    <Star className="h-3 w-3" /> Most Popular
                  </Badge>
                )}
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{tier.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={tier.highlight ? "default" : "outline"}
                  onClick={() => navigate("/auth")}
                >
                  {tier.cta}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* METRICS TEASER */}
      <section className="bg-muted/30">
        <div className="container max-w-6xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-2">Know What Every Score Means</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Our transparent rubric explains exactly how each criterion is evaluated.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {["Team Quality", "Market Size", "Product Differentiation", "Traction", "Business Model", "Competitive Landscape"].map(
              (m) => (
                <Badge key={m} variant="secondary" className="text-xs px-3 py-1.5">
                  {m}
                </Badge>
              )
            )}
          </div>
          <Button variant="link" className="gap-1" onClick={() => navigate("/scoring-rubric")}>
            View Full Scoring Guide <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="container max-w-6xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-bold">PitchScore</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                AI-powered pitch intelligence for modern investors.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 md:justify-end text-sm">
              <button onClick={() => navigate("/auth")} className="text-muted-foreground hover:text-foreground transition-colors">Login</button>
              <button onClick={() => scrollTo("pricing")} className="text-muted-foreground hover:text-foreground transition-colors">Pricing</button>
              <button onClick={() => scrollTo("how-it-works")} className="text-muted-foreground hover:text-foreground transition-colors">How It Works</button>
              <button onClick={() => navigate("/scoring-rubric")} className="text-muted-foreground hover:text-foreground transition-colors">Scoring Guide</button>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            © 2025 PitchScore. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
