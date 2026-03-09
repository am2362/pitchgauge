import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, RefreshCw } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import logo from "@/assets/logo.png";

export default function VerifyEmail() {
  usePageMeta("Verify Email — PitchGauge", "Please verify your email address to activate your PitchGauge account.");
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const email = (location.state as { email?: string })?.email || "";

  useEffect(() => {
    // If user is already confirmed, redirect to dashboard
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        navigate("/dashboard", { replace: true });
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email_confirmed_at) {
        navigate("/dashboard", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleResend = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please go back to sign up and try again.",
        variant: "destructive",
      });
      return;
    }

    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);

    if (error) {
      toast({
        title: "Resend Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email Sent",
        description: "A new confirmation email has been sent. Please check your inbox.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex items-center justify-center p-4 relative">
      <Button
        variant="ghost"
        onClick={() => navigate("/auth")}
        className="absolute top-4 left-4 text-muted-foreground hover:text-foreground gap-1.5"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sign In
      </Button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-end justify-center gap-2 mb-4">
            <img src={logo} alt="PitchGauge" className="h-10 w-10" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              PitchGauge
            </h1>
          </div>
        </div>

        <Card className="p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
            <p className="text-muted-foreground">
              Please check your email and click the confirmation link to activate your account.
            </p>
            {email && (
              <p className="text-sm text-muted-foreground">
                We sent a confirmation email to{" "}
                <span className="font-medium text-foreground">{email}</span>
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleResend}
              variant="outline"
              className="w-full"
              disabled={resending || !email}
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend confirmation email
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => navigate("/auth")}
            >
              Back to Sign In
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
