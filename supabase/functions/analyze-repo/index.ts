import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { repoUrl } = await req.json();
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

    console.log(`Analyzing repo: ${owner}/${repo}`);

    // Fetch repo files
    const codeContent = await fetchRepoFiles(owner, repo.replace(/\.git$/, ""));

    // Fetch knowledge base
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

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
  "explanation": "<2-4 paragraph analysis of the code quality, with specific examples from the code>",
  "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>", "<suggestion 4>", "<suggestion 5>"]
}

Be specific! Reference actual file names and code patterns you observed. Be entertaining but accurate.`;

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
    if (!Array.isArray(result.suggestions)) {
      result.suggestions = ["Review code organization", "Add documentation"];
    }

    console.log(`Analysis complete. Score: ${result.score}`);

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
