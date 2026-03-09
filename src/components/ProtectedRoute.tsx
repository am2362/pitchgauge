import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-external";
import { isDemoAccount } from "@/lib/demo-accounts";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check email verification (skip for demo accounts and OAuth users)
  const isDemo = isDemoAccount(user.email);
  const isOAuth = user.app_metadata?.provider && user.app_metadata.provider !== "email";
  if (!user.email_confirmed_at && !isDemo && !isOAuth) {
    return <Navigate to="/verify-email" replace state={{ email: user.email }} />;
  }

  return <>{children}</>;
}
