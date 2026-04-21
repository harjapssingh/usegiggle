// Sends a guardian an approval link for a specific job an under-18 helper has expressed interest in.
// Requires authenticated helper. If no email infra is configured, returns the link so it can be shown/shared.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { job_id, app_origin } = await req.json();
    if (!job_id) return new Response(JSON.stringify({ error: "job_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);

    // Confirm helper is under 18 and get guardian email
    const { data: helper } = await admin
      .from("helper_profiles")
      .select("is_under_18, guardian_email, guardian_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!helper?.is_under_18) {
      return new Response(JSON.stringify({ skipped: true, reason: "Helper is 18+" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!helper.guardian_email) {
      return new Response(JSON.stringify({ error: "No guardian email on file" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert approval row
    const { data: existing } = await admin
      .from("job_guardian_approvals")
      .select("token, approved")
      .eq("job_id", job_id).eq("helper_id", user.id)
      .maybeSingle();

    let token = existing?.token;
    if (!token) {
      const { data: inserted, error } = await admin
        .from("job_guardian_approvals")
        .insert({ job_id, helper_id: user.id, guardian_email: helper.guardian_email })
        .select("token")
        .single();
      if (error) throw error;
      token = inserted.token;
    }

    const origin = app_origin || req.headers.get("origin") || "";
    const approveUrl = `${origin}/guardian-approve?token=${token}`;

    // Try sending email via Lovable transactional email (best-effort)
    let emailSent = false;
    try {
      const send = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "guardian-approval",
          recipientEmail: helper.guardian_email,
          idempotencyKey: `guardian-${job_id}-${user.id}`,
          templateData: { approveUrl, helperName: helper.guardian_name || "your child" },
        },
      });
      emailSent = !send.error;
    } catch (_) { /* email infra not configured — fall back to link */ }

    return new Response(JSON.stringify({ approveUrl, emailSent, guardianEmail: helper.guardian_email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
