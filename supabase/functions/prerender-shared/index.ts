import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_URL = "https://spaghettimeter.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return new Response("Missing id", { status: 400, headers: cors });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase
    .from("shared_analyses")
    .select("repo_url, score, explanation, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return new Response("Analysis not found", { status: 404, headers: cors });
  }

  const repoSlug = data.repo_url.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  const score = Number(data.score).toFixed(1);
  const title = `${repoSlug} scored ${score}/10 on SpaghettiMeter`;
  const description = `AI-powered spaghetti-code analysis of ${repoSlug}: scored ${score}/10. See the breakdown and refactoring suggestions on SpaghettiMeter.`;
  const canonical = `${SITE_URL}/s/${id}`;
  const summary = (data.explanation || "").slice(0, 800);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    about: data.repo_url,
    url: canonical,
    datePublished: new Date(data.created_at).toISOString(),
    publisher: { "@type": "Organization", name: "SpaghettiMeter", url: SITE_URL },
    description,
  };

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${canonical}" />
<meta property="og:title" content="${escape(title)}" />
<meta property="og:description" content="${escape(description)}" />
<meta property="og:image" content="${SITE_URL}/og-image.png" />
<meta property="og:site_name" content="SpaghettiMeter" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escape(title)}" />
<meta name="twitter:description" content="${escape(description)}" />
<meta name="twitter:image" content="${SITE_URL}/og-image.png" />
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<main>
<h1>${escape(title)}</h1>
<p><strong>Repository:</strong> <a href="${escape(data.repo_url)}" rel="nofollow noopener">${escape(repoSlug)}</a></p>
<p><strong>Spaghetti score:</strong> ${score} / 10</p>
<h2>Summary</h2>
<p>${escape(summary)}</p>
<p><a href="${canonical}">View the full interactive analysis on SpaghettiMeter</a></p>
</main>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...cors,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=3600",
    },
  });
});
