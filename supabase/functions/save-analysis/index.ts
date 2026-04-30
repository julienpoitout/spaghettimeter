import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Sign in required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { repoUrl, score, summary, breakdown, suggestions } = body || {};

    if (typeof repoUrl !== "string" || typeof score !== "number") {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check plan and saved-count limit
    const { data: isProRow } = await supabase.rpc("is_pro_user", { _user_id: user.id });
    const isPro = !!isProRow;

    if (!isPro) {
      const { count } = await supabase
        .from("saved_analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if ((count ?? 0) >= 1) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Free plan allows 1 saved analysis. Upgrade to Pro for unlimited saves.",
            reason: "save_limit",
            upgradeUrl: "/pricing",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const { data: saved, error: insertError } = await supabase
      .from("saved_analyses")
      .insert({
        user_id: user.id,
        repo_url: repoUrl,
        score,
        summary: summary || "",
        breakdown: breakdown || [],
        suggestions: suggestions || [],
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, id: saved.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("save-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});