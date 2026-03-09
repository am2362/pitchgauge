import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders, secureJsonResponse, secureErrorResponse } from '../_shared/security.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return secureErrorResponse('Token is required', 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Look up and validate token
    const { data: verification, error: lookupError } = await supabaseAdmin
      .from('user_verifications')
      .select('user_id, verified')
      .eq('token', token)
      .single();

    if (lookupError || !verification) {
      return secureErrorResponse('Invalid or expired verification token', 400);
    }

    if (verification.verified) {
      return secureJsonResponse({ success: true, message: 'Already verified' });
    }

    // Mark as verified
    const { error: updateError } = await supabaseAdmin
      .from('user_verifications')
      .update({ verified: true })
      .eq('token', token);

    if (updateError) {
      console.error('[VERIFY-TOKEN] Update failed:', updateError.message);
      return secureErrorResponse('Verification failed', 500);
    }

    // Also confirm the user in auth system
    await supabaseAdmin.auth.admin.updateUserById(verification.user_id, {
      email_confirm: true,
    });

    // Return HTML that redirects to dashboard
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Verified</title>
  <meta http-equiv="refresh" content="2;url=/dashboard">
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8f9fa; }
    .card { text-align: center; padding: 2rem; border-radius: 12px; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #22c55e; }
    p { color: #6b7280; }
  </style>
</head>
<body>
  <div class="card">
    <h1>✓ Email Verified!</h1>
    <p>Redirecting to your dashboard...</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('[VERIFY-TOKEN] Error:', error);
    return secureErrorResponse('Internal server error', 500);
  }
});
