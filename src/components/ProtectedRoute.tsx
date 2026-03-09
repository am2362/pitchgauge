import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-external";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setLoading(false);
        setVerified(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check verification status from user_verifications table
  useEffect(() => {
    if (!user) return;

    const checkVerification = async () => {
      const { data, error } = await supabase
        .from('user_verifications')
        .select('verified')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no row found, user might be legacy (pre-verification). Allow access.
        console.warn('Could not check verification status:', error.message);
        setVerified(true);
      } else {
        setVerified(data.verified);
      }
      setLoading(false);
    };

    checkVerification();
  }, [user]);

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

  if (verified === false) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
}
