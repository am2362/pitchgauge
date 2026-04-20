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
  Users,
  Building2,
  Briefcase,
  ArrowRight,
  ChevronRight,
  Sparkles,
  FileText,
  Download,
  Zap,
  Star,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import logo from "@/assets/logo.png";

const Landing = () => {
  usePageMeta("PitchGauge", "Score startup pitches with AI. Get detailed scorecards, red flags, and investment theses in seconds.");
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-end gap-2">
            <img src={logo} alt="PitchGauge" className="h-6 w-6" />
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
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
                A structured triage system for{" "}
                <span className="text-primary">early-stage deal flow</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                PitchGauge is an internal screening tool for angels, micro-VCs and accelerators. Run a consistent first pass on every inbound pitch, filter against a structured scoring framework, and decide which startups warrant deeper diligence — before your team spends time on them.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button size="lg" className="gap-2" onClick={() => navigate("/auth")}>
                  Start for Free <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate("/demo")}>
                  Try Demo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/70 italic max-w-md">
                A first-pass screening layer designed to support — not replace — the judgement of your investment team.
              </p>
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
                    <Badge>8 / 10</Badge>
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

      {/* USE CASES */}
      <section className="border-y border-border bg-muted/30">
        <div className="container max-w-6xl mx-auto px-4 py-10">
          <p className="text-center text-sm font-semibold text-foreground mb-5">
            Internal tooling for investors who screen at scale
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-5">
            {["VC deal flow triage", "Angel first-pass review", "Accelerator batch screening", "Family office pipeline review"].map((label) => (
              <Badge key={label} variant="secondary" className="text-xs px-4 py-2">
                {label}
              </Badge>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            First-pass screening · Deal shortlisting · Batch deal flow screening up to 100 startups
          </p>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="scroll-mt-20">
        <div className="container max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">The Problem</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">An average fund reviews 1,000+ pitches a year.</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Most are rejected within minutes — not because they lacked merit, but because there was no structured way to triage them at the top of the funnel.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Layers,
                title: "Unstructured deal flow",
                desc: "Inbound decks accumulate across email, referrals and platforms. Manual triage is slow, inconsistent, and hard to scale across a team.",
              },
              {
                icon: Users,
                title: "Inconsistent first-pass review",
                desc: "Two analysts looking at the same pitch reach different conclusions. Without a shared framework, scoring drifts and good deals get missed.",
              },
              {
                icon: Clock,
                title: "Diligence time spent on the wrong deals",
                desc: "Hours of analyst time go into pitches that should have been filtered out earlier — time that should be reserved for your highest-conviction prospects.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="p-6 border-border bg-card">
                <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-5">
                  <Icon className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-10 max-w-2xl mx-auto leading-relaxed">
            PitchGauge applies a consistent first-pass score to every inbound pitch, so your team only spends diligence time on deals that clear the bar.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="container max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">A three-step screening workflow</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Upload,
                title: "Submit the pitch",
                desc: "Upload the deck or paste the pitch text into your screening queue.",
                step: "01",
              },
              {
                icon: Brain,
                title: "Score against the framework",
                desc: "Each pitch is scored across six investment criteria using a consistent rubric.",
                step: "02",
              },
              {
                icon: CheckCircle,
                title: "Route the decision",
                desc: "Triage outputs feed into your pipeline: pass, watchlist, or move to diligence.",
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
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">A structured workflow for screening deal flow</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Three modes covering the full top-of-funnel: individual pitch review, shortlist comparison, and batch screening across an entire pipeline.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: "First-Pass Screening",
                desc: "Score a single pitch against six criteria — Team, Market, Product, Traction, Business Model, Competitive Landscape. Outputs include red flags, founder questions, bull/bear thesis and a benchmark percentile.",
              },
              {
                icon: GitCompare,
                title: "Deal Shortlisting",
                desc: "Compare up to 5 startups side-by-side once they clear first-pass. Ranked output with score breakdowns and key strengths and weaknesses to support the shortlisting discussion.",
              },
              {
                icon: Layers,
                title: "Batch Deal Flow Screening",
                desc: "Upload up to 100 startups via Excel for batch triage. Returns a ranked top 20, sector distribution, and an exportable report for pipeline review meetings.",
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
                features: ["3 single analyses/day", "No comparison mode", "No bulk analysis", "Basic JSON + PDF download"],
                cta: "Get Started Free",
                highlight: false,
              },
              {
                name: "Pro",
                price: "$39",
                period: "/mo",
                desc: "For active angel investors",
                features: [
                  "50 single analyses/day",
                  "10 comparisons/day (up to 5 startups)",
                  "Full download options",
                  "30-day history",
                ],
                cta: "Start Pro Trial",
                highlight: true,
              },
              {
                name: "Scale",
                price: "$99",
                period: "/mo",
                desc: "For funds & accelerators",
                features: [
                  "100 single analyses/day",
                  "20 comparisons/day",
                  "3 bulk jobs/day (up to 100 startups each)",
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
              <div className="flex items-end gap-2 mb-2">
                <img src={logo} alt="PitchGauge" className="h-5 w-5" />
                <span className="font-bold">PitchGauge</span>
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
            © 2025 PitchGauge. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
