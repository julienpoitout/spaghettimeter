import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AnalysisResults, { type AnalysisResult } from "@/components/AnalysisResults";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Seo from "@/components/Seo";

const SharedAnalysis = () => {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("shared_analyses")
        .select("repo_url, score, explanation, suggestions")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        setError("Failed to load analysis");
      } else if (!data) {
        setError("Analysis not found");
      } else {
        setRepoUrl(data.repo_url);
        // suggestions column may be a legacy string[] or the new structured
        // payload { breakdown, suggestions }.
        const raw = data.suggestions as any;
        let breakdown: any[] = [];
        let suggestions: any[] = [];
        if (Array.isArray(raw)) {
          suggestions = raw;
        } else if (raw && typeof raw === "object") {
          breakdown = Array.isArray(raw.breakdown) ? raw.breakdown : [];
          suggestions = Array.isArray(raw.suggestions) ? raw.suggestions : [];
        }
        setResult({
          score: Number(data.score),
          summary: data.explanation,
          breakdown,
          suggestions,
        });
      }
      setLoading(false);
    };
    load();
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      {result && (
        <Seo
          title={`${repoUrl.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "")} scored ${result.score.toFixed(1)}/10 on SpaghettiMeter`}
          description={`See the AI-powered spaghetti-code analysis of ${repoUrl.replace(/^https?:\/\/github\.com\//, "")} — score ${result.score.toFixed(1)}/10 with refactoring suggestions.`}
          canonical={`https://spaghettimeter.com/s/${id}`}
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "Article",
            headline: `${repoUrl.replace(/^https?:\/\/github\.com\//, "")} scored ${result.score.toFixed(1)}/10 on SpaghettiMeter`,
            about: repoUrl,
            url: `https://spaghettimeter.com/s/${id}`,
            publisher: { "@type": "Organization", name: "SpaghettiMeter" },
          }}
        />
      )}
      <div className="container max-w-3xl mx-auto px-4 py-12 space-y-8">
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-5xl">🍝</div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Shared Spaghetti<span className="text-primary">Meter</span> Result
          </h1>
        </motion.div>

        {loading && (
          <p className="text-center text-muted-foreground font-body">Loading analysis...</p>
        )}

        {error && (
          <div className="text-center space-y-4">
            <p className="text-destructive font-body">{error}</p>
            <Link to="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Analyze your own repo
              </Button>
            </Link>
          </div>
        )}

        {result && !loading && (
          <>
            <AnalysisResults result={result} repoUrl={repoUrl} shareId={id} />
            <div className="text-center pt-4 pb-24">
              <Link to="/">
                <Button variant="spaghettify" size="lg" className="gap-2">
                  🍴 Spaghettify your own repo
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>

      {result && !loading && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4">
          <Link to="/">
            <Button
              variant="spaghettify"
              size="lg"
              className="gap-2 shadow-2xl shadow-primary/30"
            >
              🍴 Spaghettify your own repo
            </Button>
          </Link>
        </div>
      )}

      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground font-body">
          Created by{" "}
          <a
            href="https://curiouscode.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Curious Code
          </a>
        </p>
      </footer>
    </div>
  );
};

export default SharedAnalysis;