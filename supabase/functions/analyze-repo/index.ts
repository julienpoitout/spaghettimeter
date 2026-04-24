import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchRepoFiles(owner: string, repo: string, token?: string): Promise<string> {
  const ghHeaders: Record<string, string> = { "User-Agent": "SpaghettiMeter" };
  if (token) ghHeaders.Authorization = `Bearer ${token}`;

  // Get the repo tree recursively
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
    { headers: ghHeaders }
  );

  if (!treeRes.ok) {
    const errText = await treeRes.text();
    throw new Error(`GitHub API error (${treeRes.status}): ${errText}`);
  }

  const treeData = await treeRes.json();
  const files = treeData.tree?.filter(
    (f: any) =>
      f.type === "blob" &&
      /\.(ts|tsx|js|jsx|py|java|go|rs|rb|cs|cpp|c|h|php|swift|kt)$/.test(f.path) &&
      !f.path.includes("node_modules") &&
      !f.path.includes(".min.") &&
      !f.path.includes("dist/") &&
      !f.path.includes("build/") &&
      !f.path.includes("vendor/") &&
      !f.path.includes("__pycache__")
  ) || [];

  // Limit to ~30 files to stay within token limits, prioritize src files
  const sorted = files.sort((a: any, b: any) => {
    const aScore = a.path.includes("src/") ? 0 : 1;
    const bScore = b.path.includes("src/") ? 0 : 1;
    return aScore - bScore;
  });
  const selected = sorted.slice(0, 30);

  // Fetch contents
  const contents: string[] = [];
  let totalChars = 0;
  const MAX_CHARS = 80000;

  for (const file of selected) {
    if (totalChars > MAX_CHARS) break;

    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
        { headers: { ...ghHeaders, Accept: "application/vnd.github.raw" } }
      );
      if (res.ok) {
        const text = await res.text();
        const truncated = text.slice(0, 3000);
        contents.push(`--- FILE: ${file.path} ---\n${truncated}`);
        totalChars += truncated.length;
      }
    } catch {
      // skip failed files
    }
  }

  return `Repository: ${owner}/${repo}\nTotal code files found: ${files.length}\nFiles analyzed: ${selected.length}\n\n${contents.join("\n\n")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoUrl, githubToken } = await req.json();
    if (!repoUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "repoUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse GitHub URL
    const match = repoUrl.match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
    if (!match) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid GitHub URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [, owner, repo] = match;

    console.log(`Analyzing repo: ${owner}/${repo} (auth: ${githubToken ? "yes" : "no"})`);

    // Basic token sanity check
    const safeToken =
      typeof githubToken === "string" && githubToken.length > 10 && githubToken.length < 500
        ? githubToken
        : undefined;

    // Identify caller (signed-in user or guest fingerprint)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    let userId: string | null = null;
    if (token) {
      const { data: { user } } = await sb.auth.getUser(token);
      if (user) userId = user.id;
    }

    // Private repos require sign-in
    if (safeToken && !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Sign in required to analyze private repos with a GitHub token.",
          reason: "auth_required",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine plan
    let isPro = false;
    if (userId) {
      const { data } = await sb.rpc("is_pro_user", { _user_id: userId });
      isPro = !!data;
    }

    // Enforce 3-per-rolling-7-days quota for guests + Free users
    let guestFingerprint: string | null = null;
    if (!isPro) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      let used = 0;
      if (userId) {
        const { count } = await sb
          .from("analysis_usage")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", sevenDaysAgo);
        used = count ?? 0;
      } else {
        const ip =
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("cf-connecting-ip") ||
          "unknown";
        const ua = req.headers.get("user-agent") || "unknown";
        guestFingerprint = await sha256(`${ip}|${ua}`);
        const { count } = await sb
          .from("analysis_usage")
          .select("id", { count: "exact", head: true })
          .eq("guest_fingerprint", guestFingerprint)
          .gte("created_at", sevenDaysAgo);
        used = count ?? 0;
      }

      if (used >= 3) {
        return new Response(
          JSON.stringify({
            success: false,
            error: userId
              ? "You've reached your 3 free analyses for the week. Upgrade to Pro for unlimited."
              : "You've reached the free guest limit (3/week). Sign up or upgrade for more.",
            reason: "quota",
            plan: userId ? "free" : "guest",
            used,
            limit: 3,
            upgradeUrl: "/pricing",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch repo files
    const codeContent = await fetchRepoFiles(owner, repo.replace(/\.git$/, ""), safeToken);

    // Fetch knowledge base
    const { data: knowledge } = await sb
      .from("spaghetti_knowledge")
      .select("title, content, category");

    let knowledgeContext = "";
    if (knowledge && knowledge.length > 0) {
      knowledgeContext = "\n\n## ADDITIONAL KNOWLEDGE BASE (use this to inform your analysis):\n\n" +
        knowledge.map((k: any) => `### ${k.title} [${k.category}]\n${k.content}`).join("\n\n");
    }

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are the Spaghetti Code Detective — an expert code quality analyst with a fun, Italian-chef personality.

Your job is to analyze a GitHub repository's code and rate its CODE QUALITY on a scale from 0.1 (absolute spaghetti disaster) to 10.0 (pristine, clean code). A HIGH score means CLEAN code. A LOW score means SPAGHETTI code.

EVALUATION CRITERIA:
- Code organization and structure (file/folder layout)
- Naming conventions (variables, functions, classes)
- Function/method length and complexity
- Code duplication (DRY principle violations)
- Coupling between modules (tight vs loose)
- Error handling quality
- Type safety and documentation
- Single Responsibility Principle adherence
- Depth of nesting (callback hell, deeply nested conditionals)
- Dependency management
- Separation of concerns
- Magic numbers and hardcoded values
- Dead code and unused imports
- Consistency of patterns across the codebase
${knowledgeContext}

You MUST respond with valid JSON using this exact structure (no markdown, no code fences):
{
  "score": <number between 0.1 and 10.0>,
  "summary": "<one short punchy paragraph (2-3 sentences) giving the overall verdict, with personality>",
  "breakdown": [
    {
      "category": "<one of: Structure & Organization | Naming & Readability | Complexity & Coupling | Error Handling & Safety | Consistency & Patterns>",
      "rating": "<one of: excellent | good | mediocre | poor | terrible>",
      "observation": "<2-3 sentences citing concrete file names or patterns from the code>"
    }
  ],
  "suggestions": [
    {
      "title": "<short imperative title, max 8 words>",
      "detail": "<1-2 sentences explaining what to do and why, referencing files when possible>",
      "priority": "<one of: high | medium | low>"
    }
  ]
}

Rules:
- "breakdown" MUST contain exactly 5 entries, one per category listed above, in that order.
- "suggestions" MUST contain 4 to 6 entries, ordered from highest to lowest priority.
- Be specific: reference actual file names, function names, and code patterns you observed.
- Be entertaining (Italian-chef voice welcome) but accurate.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this repository's spaghetti level:\n\n${codeContent}` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      throw new Error(`AI gateway error (${aiResponse.status}): ${errText}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON: " + content.slice(0, 200));
    }

    // Validate
    if (typeof result.score !== "number" || result.score < 0.1 || result.score > 10) {
      result.score = Math.max(0.1, Math.min(10, result.score || 5));
    }
    if (typeof result.summary !== "string") {
      result.summary = result.explanation || "No summary provided.";
    }
    if (!Array.isArray(result.breakdown)) {
      result.breakdown = [];
    }
    if (!Array.isArray(result.suggestions)) {
      result.suggestions = [];
    }
    // Normalize legacy string suggestions to objects
    result.suggestions = result.suggestions.map((s: any) =>
      typeof s === "string"
        ? { title: s.slice(0, 60), detail: s, priority: "medium" }
        : { title: s.title || "Suggestion", detail: s.detail || "", priority: s.priority || "medium" }
    );

    console.log(`Analysis complete. Score: ${result.score}`);

    // Log usage (only for guests + Free; Pro is unmetered but we still log for analytics)
    try {
      await sb.from("analysis_usage").insert({
        user_id: userId,
        guest_fingerprint: userId ? null : guestFingerprint,
        repo_url: repoUrl,
      });
    } catch (logErr) {
      console.error("Failed to log usage:", logErr);
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-repo error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
