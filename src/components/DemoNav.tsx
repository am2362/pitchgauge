import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, ArrowRight, FileText, GitCompare, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

export function DemoNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { path: "/demo", label: "Single Analysis", icon: FileText },
    { path: "/demo/compare", label: "Comparison", icon: GitCompare },
    { path: "/demo/bulk", label: "Bulk Analysis", icon: Layers },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-7xl mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={logo} alt="PitchGauge" className="h-6 w-6" />
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              PitchGauge
            </span>
          </button>
          <div className="hidden sm:flex items-center gap-1">
            {links.map(({ path, label, icon: Icon }) => (
              <Button
                key={path}
                variant={location.pathname === path ? "secondary" : "ghost"}
                size="sm"
                className={cn("gap-1.5 text-xs", location.pathname === path && "font-semibold")}
                onClick={() => navigate(path)}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </div>
        </div>
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
  );
}
