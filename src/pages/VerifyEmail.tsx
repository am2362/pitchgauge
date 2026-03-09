import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, RefreshCw, CheckCircle2 } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import logo from "@/assets/logo.png";

export default function VerifyEmail() {
  usePageMeta("Verify Email — PitchGauge", "Please verify your email address to activate your PitchGauge account.");
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const email = (location.state as { email?: string })?.email || "";
  const token = searchParams.get("token");

  // Handle token-based verification
  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      setVerifying(true);
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/verify-email-token?token=${token}`,
          { method: 'GET' }
        );

        if (response.ok) {
          setVerified(true);
          toast({
            title: "Email Verified!",
            description: "Your account has been activated. Redirecting...",
          });
          setTimeout(() => navigate("/dashboard", { replace: true }), 2000);
        } else {
          toast({
            title: "Verification Failed",
            description: "Invalid or expired token. Please request a new verification email.",
            variant: "destructive",
          });
        }
      } catch {
        toast({
          title: "Verification Failed",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
      setVerifying(false);
    };

    verifyToken();
  }, [token, navigate, toast]);

  // Poll verification status
  const checkVerificationStatus = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data } = await supabase
      .from('user_verifications')
      .select('verified')
      .eq('user_id', session.user.id)
      .single();

    if (data?.verified) {
      setVerified(true);
      toast({
        title: "Email Verified!",
        description: "Your account has been activated. Redirecting...",
      });
      setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
    }
  }, [navigate, toast]);

  useEffect(() => {
    if (token || verified) return;

    // Check immediately
    checkVerificationStatus();

    // Poll every 5 seconds
    const interval = setInterval(checkVerificationStatus, 5000);

    // Also check on window focus
    const handleFocus = () => checkVerificationStatus();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [token, verified, checkVerificationStatus]);

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

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/send-verification-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              userId: session.user.id,
              email,
              redirectTo: `${window.location.origin}/dashboard`,
            }),
          }
        );
      }

      toast({
        title: "Email Sent",
        description: "A new confirmation email has been sent. Please check your inbox.",
      });
    } catch {
      toast({
        title: "Resend Failed",
        description: "Could not send verification email. Please try again.",
        variant: "destructive",
      });
    }

    setResending(false);
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex items-center justify-center p-4">
        <Card className="p-8 text-center space-y-4 max-w-md">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Email Verified!</h2>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </Card>
      </div>
    );
  }

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
