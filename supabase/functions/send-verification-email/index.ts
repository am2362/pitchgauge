import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders, secureJsonResponse, secureErrorResponse } from '../_shared/security.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, redirectTo } = await req.json();

    if (!userId || !email) {
      return secureErrorResponse('userId and email are required', 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Un-confirm the user (undo auto-confirm)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: false,
    });

    if (updateError) {
      console.error('[SEND-VERIFICATION] Failed to un-confirm user:', updateError.message);
      return secureErrorResponse('Failed to prepare verification', 500);
    }

    // Regenerate verification token in user_verifications
    const { error: tokenError } = await supabaseAdmin
      .from('user_verifications')
      .update({ token: crypto.randomUUID(), verified: false })
      .eq('user_id', userId);

    if (tokenError) {
      console.error('[SEND-VERIFICATION] Failed to update token:', tokenError.message);
    }

    // Try to trigger native Supabase confirmation email via resend
    const resendResponse = await fetch(`${supabaseUrl}/auth/v1/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
      },
      body: JSON.stringify({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectTo || `${supabaseUrl}`,
        },
      }),
    });

    const resendOk = resendResponse.ok;
    if (!resendOk) {
      const resendBody = await resendResponse.text();
      console.error('[SEND-VERIFICATION] Resend failed:', resendBody);
    }

    return secureJsonResponse({
      success: true,
      emailSent: resendOk,
    });
  } catch (error) {
    console.error('[SEND-VERIFICATION] Error:', error);
    return secureErrorResponse('Internal server error', 500);
  }
});
