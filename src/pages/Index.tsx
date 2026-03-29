import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import AnalysisResults, { type AnalysisResult } from "@/components/AnalysisResults";
import KnowledgeManager from "@/components/KnowledgeManager";
import { LogOut } from "lucide-react";

const Index = () => {
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();
  const { user, isAdmin, signOut } = useAuth();

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) {
      toast({ title: "Please paste a GitHub repo URL", variant: "destructive" });
      return;
    }

    // Basic GitHub URL validation
    const githubRegex = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;
    if (!githubRegex.test(repoUrl.trim())) {
      toast({
        title: "Invalid GitHub URL",
        description: "Please paste a valid public GitHub repository URL (e.g., https://github.com/user/repo)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-repo", {
        body: { repoUrl: repoUrl.trim() },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Analysis failed");

      setResult(data.result);
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast({
        title: "Analysis failed 😞",
        description: err.message || "Something went wrong. Is the repo public?",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="text-6xl"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            🍝
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
            Spaghetti<span className="text-primary">Meter</span>
          </h1>
          <p className="text-muted-foreground font-body text-lg max-w-md mx-auto">
            How tangled is your code? Paste a GitHub repo and find out.
          </p>
        </motion.div>

        {/* Input area */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Input
            placeholder="https://github.com/user/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            className="flex-1 h-12 text-base font-body"
            disabled={isLoading}
          />
          <Button
            variant="spaghettify"
            size="lg"
            onClick={handleAnalyze}
            disabled={isLoading}
            className="h-12 px-8"
          >
            {isLoading ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                🍝
              </motion.span>
            ) : (
              "🍴 Spaghettify"
            )}
          </Button>
        </motion.div>

        {/* Loading state */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="text-center space-y-3 py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.p
                className="text-lg font-display text-muted-foreground"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Cooking up your analysis...
              </motion.p>
              <p className="text-sm text-muted-foreground font-body">
                Fetching repo files and analyzing code quality
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && !isLoading && (
            <AnalysisResults result={result} repoUrl={repoUrl} />
          )}
        </AnimatePresence>

        {/* Knowledge base manager */}
        <div className="pt-8 border-t border-border">
          <KnowledgeManager />
        </div>
      </div>
    </div>
  );
};

export default Index;
