import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase-external";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, GitCompare, BarChart, History, User, CreditCard, Settings, LogOut, ChevronDown } from "lucide-react";
import logo from "@/assets/logo.png";

const navLinks = [
  { label: "Single Analysis", path: "/dashboard", icon: FileText },
  { label: "Comparison", path: "/compare", icon: GitCompare },
  { label: "Bulk Analysis", path: "/bulk-analysis", icon: BarChart },
  { label: "History", path: "/history", icon: History },
];

export default function AppNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tier, isDemoAccount } = useSubscription();
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-7xl mx-auto flex h-14 items-center justify-between px-4">
        {/* Left: Logo */}
        <button onClick={() => navigate("/dashboard")} className="flex items-end gap-2 hover:opacity-80 transition-opacity">
          <img src={logo} alt="PitchGauge" className="h-6 w-6" />
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            PitchGauge
          </span>
        </button>

        {/* Center: Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Button
                key={path}
                variant={active ? "secondary" : "ghost"}
                size="sm"
                onClick={() => navigate(path)}
                className="gap-1.5"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            );
          })}
        </div>

        {/* Right: Account dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <Badge variant={isDemoAccount ? "default" : tier === "free" ? "secondary" : "default"} className="capitalize text-xs">
                {isDemoAccount ? "Demo Account" : tier}
              </Badge>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/billing")}>
              <CreditCard className="h-4 w-4 mr-2" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/scoring-rubric")}>
              <FileText className="h-4 w-4 mr-2" />
              Scoring Rubric
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
