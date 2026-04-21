// Public endpoint: marks a guardian approval as approved given a valid token. No auth required.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") ?? (await req.json().catch(() => ({}))).token;
    if (!token) return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: row } = await admin
      .from("job_guardian_approvals")
      .select("id, approved, job_id, helper_id")
      .eq("token", token)
      .maybeSingle();

    if (!row) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (req.method === "GET") {
      // Just return current status (for the page to display)
      return new Response(JSON.stringify({ approved: row.approved }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST → mark approved
    if (!row.approved) {
      await admin.from("job_guardian_approvals")
        .update({ approved: true, approved_at: new Date().toISOString() })
        .eq("id", row.id);
    }

    return new Response(JSON.stringify({ approved: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
