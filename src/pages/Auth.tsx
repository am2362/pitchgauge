import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase-external";
import { lovable } from "@/integrations/lovable/index";
import { isDemoAccount } from "@/lib/demo-accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import logo from "@/assets/logo.png";

type Mode = "signin" | "signup" | "magic" | "magic-sent" | "forgot" | "forgot-sent";

export default function Auth() {
  usePageMeta("PitchGauge", "Sign in to your PitchGauge account.");
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Only allow same-origin relative paths for `next`.
  const rawNext = searchParams.get("next") ?? "";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const redirectUrl = `${window.location.origin}${nextPath}`;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(nextPath);
    });
  }, [navigate, nextPath]);

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      });

      if (signUpError) {
        setLoading(false);
        toast({ title: "Sign up failed", description: signUpError.message, variant: "destructive" });
        return;
      }

      // Demo accounts bypass verification
      if (isDemoAccount(email)) {
        setLoading(false);
        navigate(nextPath);
        return;
      }

      // Send verification OTP
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectUrl },
      });

      setLoading(false);
      navigate("/verify-email", { state: { email, next: nextPath } });
    } else {
      // Sign in
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);

      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      } else {
        navigate(nextPath);
      }
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Failed to send link", description: error.message, variant: "destructive" });
    } else {
      setMode("magic-sent");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Failed to send reset email", description: error.message, variant: "destructive" });
    } else {
      setMode("forgot-sent");
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: redirectUrl,
    });
    setGoogleLoading(false);
    if (error) {
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
    }
  };

  const renderSentState = (title: string, description: string) => (
    <div className="text-center space-y-4 py-4">
      <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <CheckCircle2 className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {description}{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>
      <Button variant="outline" className="w-full" onClick={() => { setMode("signin"); setEmail(""); setPassword(""); }}>
        <Mail className="mr-2 h-4 w-4" />
        Use a different email
      </Button>
    </div>
  );

  const renderForm = () => {
    if (mode === "magic-sent") return renderSentState("Check your email", "We've sent a login link to");
    if (mode === "forgot-sent") return renderSentState("Check your email", "We've sent a password reset link to");

    if (mode === "magic") {
      return (
        <div className="space-y-4">
          <div className="text-center space-y-1 mb-2">
            <h2 className="text-lg font-semibold text-foreground">Magic link sign in</h2>
            <p className="text-sm text-muted-foreground">We'll email you a link to sign in instantly.</p>
          </div>
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Send Magic Link
            </Button>
          </form>
          <Button variant="ghost" className="w-full text-sm" onClick={() => setMode("signin")}>
            Back to password sign in
          </Button>
        </div>
      );
    }

    if (mode === "forgot") {
      return (
        <div className="space-y-4">
          <div className="text-center space-y-1 mb-2">
            <h2 className="text-lg font-semibold text-foreground">Reset password</h2>
            <p className="text-sm text-muted-foreground">Enter your email to receive a reset link.</p>
          </div>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send reset link
            </Button>
          </form>
          <Button variant="ghost" className="w-full text-sm" onClick={() => setMode("signin")}>
            Back to sign in
          </Button>
        </div>
      );
    }

    // signin / signup
    const isSignUp = mode === "signup";
    return (
      <div className="space-y-4">
        <div className="text-center space-y-1 mb-2">
          <h2 className="text-lg font-semibold text-foreground">
            {isSignUp ? "Create your account" : "Sign in to PitchGauge"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Sign up with your email and password." : "Choose your preferred sign-in method."}
          </p>
        </div>

        <form onSubmit={handlePasswordAuth} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Email</label>
            <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Password</label>
              {!isSignUp && (
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => setMode("forgot")}>
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !email.trim() || !password.trim()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <Button variant="ghost" className="w-full text-sm" onClick={() => setMode("magic")}>
          <Mail className="mr-2 h-4 w-4" />
          Send me a magic link instead
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            className="text-primary hover:underline font-medium"
            onClick={() => { setMode(isSignUp ? "signin" : "signup"); setPassword(""); }}
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex items-center justify-center p-4 relative">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 text-muted-foreground hover:text-foreground gap-1.5"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-end justify-center gap-2 mb-4">
            <img src={logo} alt="PitchGauge" className="h-10 w-10" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              PitchGauge
            </h1>
          </div>
          <p className="text-muted-foreground">AI-Powered Pitch Intelligence</p>
        </div>

        <Card className="p-6">{renderForm()}</Card>
      </div>
    </div>
  );
}
