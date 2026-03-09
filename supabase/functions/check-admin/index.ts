import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, secureJsonResponse, secureErrorResponse, safeLog } from "../_shared/security.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return secureErrorResponse("Unauthorized", 401);
    }

    // Verify the user's JWT via service role client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return secureErrorResponse("Unauthorized", 401);
    }

    const userEmail = userData.user.email;
    if (!userEmail) {
      return secureJsonResponse({ isAdmin: false });
    }

    safeLog("CHECK-ADMIN", "Checking admin status");

    // Query admin_users table using service role (no client RLS needed)
    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (error) {
      safeLog("CHECK-ADMIN", "DB query error");
      return secureErrorResponse("Internal server error", 500);
    }

    const isAdmin = data !== null;
    safeLog("CHECK-ADMIN", "Admin check complete");

    return secureJsonResponse({ isAdmin });
  } catch (error) {
    safeLog("CHECK-ADMIN", "Unhandled error");
    return secureErrorResponse("Internal server error", 500);
  }
});
