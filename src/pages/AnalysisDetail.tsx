import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AnalysisResults, { AnalysisResult } from "@/components/AnalysisResults";
import Seo from "@/components/Seo";

interface SavedAnalysis {
  id: string;
  repo_url: string;
  score: number;
  summary: string | null;
  breakdown: any[];
  suggestions: any[];
  created_at: string;
}

const AnalysisDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<SavedAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate(`/auth?next=/analysis/${id}`);
  }, [user, authLoading, id, navigate]);

  useEffect(() => {
    if (authLoading || !user || !id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("saved_analyses")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        toast({ title: "Couldn't load analysis", description: error.message, variant: "destructive" });
      }
      setAnalysis((data as any) || null);
      setLoading(false);
    })();
  }, [id, user, authLoading, toast]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <motion.div
            className="text-5xl"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          >
            🍝
          </motion.div>
          <p className="font-display text-muted-foreground">Loading analysis…</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-3xl mx-auto px-4 py-10 space-y-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground font-body">Analysis not found.</p>
          </div>
        </div>
      </div>
    );
  }

  const result: AnalysisResult = {
    score: Number(analysis.score),
    summary: analysis.summary || "",
    breakdown: (analysis.breakdown as any) || [],
    suggestions: (analysis.suggestions as any) || [],
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`Analysis — ${analysis.repo_url.replace("https://github.com/", "")}`}
        description="Saved code-quality analysis result."
      />
      <div className="container max-w-3xl mx-auto px-4 py-10 space-y-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
        <p className="text-xs text-muted-foreground font-body">
          Saved {new Date(analysis.created_at).toLocaleString()}
        </p>
        <AnalysisResults result={result} repoUrl={analysis.repo_url} />
      </div>
    </div>
  );
};

export default AnalysisDetail;
