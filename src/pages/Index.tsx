import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import AnalysisResults, { type AnalysisResult } from "@/components/AnalysisResults";
import KnowledgeManager from "@/components/KnowledgeManager";
import RepoSelector from "@/components/RepoSelector";
import { LogOut, LogIn, LayoutDashboard, Crown, Bookmark, Menu, CreditCard } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import FeedbackForm from "@/components/FeedbackForm";
import GitHubConnect from "@/components/GitHubConnect";
import { useGitHubToken } from "@/hooks/useGitHubToken";
import Seo from "@/components/Seo";
import { useSubscription } from "@/hooks/useSubscription";

const Index = () => {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();
  const { user, isAdmin, signOut } = useAuth();
  const { token } = useGitHubToken();
  const { isPro, remainingAnalyses, savedCount, savedLimit, refresh } = useSubscription();
  const navigate = useNavigate();

  const seo = (
    <Seo
      title="SpaghettiMeter — Measure How Tangled Your Code Is"
      description="Free AI-powered code quality scanner. Paste any GitHub repo and get an instant spaghetti-code score from 0 to 10, plus actionable refactoring suggestions."
      canonical="https://spaghettimeter.com/"
      ogImage="https://spaghettimeter.com/og-image.png"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Is SpaghettiMeter free?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes — SpaghettiMeter is free to use for both public and private GitHub repositories.",
            },
          },
          {
            "@type": "Question",
            name: "Can I analyse private repos?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Connect your GitHub account with a personal access token and you'll be able to scan any repository you have access to, public or private.",
            },
          },
          {
            "@type": "Question",
            name: "Which languages are supported?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "SpaghettiMeter works with TypeScript, JavaScript, Python, Go, Rust, Java, C#, Ruby, PHP, Kotlin, Swift, C, C++ and more.",
            },
          },
          {
            "@type": "Question",
            name: "Do you store my source code?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. We fetch files only to run the analysis, then discard them. Only the score, summary and suggestions are stored when you choose to share the result.",
            },
          },
        ],
      }}
    />
  );

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
    setShareId(null);
    setSaved(false);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-repo", {
        body: { repoUrl: repoUrl.trim(), githubToken: token || undefined },
      });

      // Note: supabase.functions.invoke surfaces non-2xx as `error` AND still
      // returns the parsed JSON body via `data` (when the function responded).
      // We must inspect `data.reason` BEFORE treating `error` as fatal so we
      // can show user-actionable messages for quota / auth.
      if (data && data.success === false && (data.reason === "quota" || data.reason === "auth_required")) {
        const isAuth = data.reason === "auth_required";
        toast({
          title: isAuth ? "Sign in required" : "Weekly limit reached 🍝",
          description:
            data.error ||
            (isAuth
              ? "Sign in to analyze private repos."
              : "You've used your 3 free analyses this week. Upgrade to Pro for unlimited."),
        });
        navigate(isAuth ? "/auth?next=/" : "/pricing");
        return;
      }
      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || "Analysis failed");
      }

      setResult(data.result);
      refresh();

      // Persist the analysis so it can be shared via link.
      // We store the structured payload (breakdown + suggestions) inside the
      // existing `suggestions` jsonb column to avoid a schema change.
      try {
        const r = data.result;
        const payload = {
          breakdown: r.breakdown ?? [],
          suggestions: r.suggestions ?? [],
        };
        const { data: saved, error: saveError } = await supabase
          .from("shared_analyses")
          .insert({
            repo_url: repoUrl.trim(),
            score: r.score,
            explanation: r.summary ?? r.explanation ?? "",
            suggestions: payload,
          })
          .select("id")
          .single();
        if (saveError) throw saveError;
        if (saved?.id) setShareId(saved.id);
      } catch (saveErr) {
        console.error("Failed to save shareable analysis:", saveErr);
      }
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

  const handleSaveToDashboard = async () => {
    if (!user) {
      navigate("/auth?next=/");
      return;
    }
    if (!result) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("save-analysis", {
        body: {
          repoUrl: repoUrl.trim(),
          score: result.score,
          summary: result.summary || result.explanation || "",
          breakdown: result.breakdown || [],
          suggestions: result.suggestions || [],
        },
      });
      if (error) throw error;
      if (!data?.success) {
        if (data?.reason === "save_limit") {
          toast({
            title: "Save limit reached",
            description: "Free plan allows 1 saved analysis. Upgrade to Pro for unlimited saves.",
            variant: "destructive",
          });
          navigate("/pricing");
          return;
        }
        throw new Error(data?.error || "Save failed");
      }
      setSaved(true);
      refresh();
      toast({ title: "Saved to your dashboard 🍝" });
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {seo}
      {/* Desktop nav */}
      <div className="absolute top-4 right-4 hidden md:flex items-center gap-2">
        <GitHubConnect />
        {!isPro && (
          <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary">
            <Link to="/pricing"><Crown className="w-4 h-4 mr-1" /> Pro</Link>
          </Button>
        )}
        {user && (
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            <Link to="/dashboard"><LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard</Link>
          </Button>
        )}
        {user && (
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            <Link to="/billing"><CreditCard className="w-4 h-4 mr-1" /> Billing</Link>
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setFeedbackOpen(true)} className="text-muted-foreground hover:text-primary">
          Feedback?
        </Button>
        {!user && (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/auth"><LogIn className="w-4 h-4" /> Sign in</Link>
          </Button>
        )}
        {user && (
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        )}
      </div>

      {/* Mobile hamburger */}
      <div className="absolute top-4 right-4 md:hidden">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle className="font-display">Menu</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-2">
              <div className="pb-2"><GitHubConnect /></div>
              {!isPro && (
                <Button asChild variant="ghost" className="justify-start text-primary hover:text-primary" onClick={() => setMenuOpen(false)}>
                  <Link to="/pricing"><Crown className="w-4 h-4 mr-2" /> Pro</Link>
                </Button>
              )}
              {user && (
                <Button asChild variant="ghost" className="justify-start text-muted-foreground hover:text-primary" onClick={() => setMenuOpen(false)}>
                  <Link to="/dashboard"><LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard</Link>
                </Button>
              )}
              {user && (
                <Button asChild variant="ghost" className="justify-start text-muted-foreground hover:text-primary" onClick={() => setMenuOpen(false)}>
                  <Link to="/billing"><CreditCard className="w-4 h-4 mr-2" /> Billing</Link>
                </Button>
              )}
              <Button
                variant="ghost"
                className="justify-start text-muted-foreground hover:text-primary"
                onClick={() => { setMenuOpen(false); setFeedbackOpen(true); }}
              >
                Feedback?
              </Button>
              {!user && (
                <Button asChild variant="outline" className="justify-start gap-2" onClick={() => setMenuOpen(false)}>
                  <Link to="/auth"><LogIn className="w-4 h-4" /> Sign in</Link>
                </Button>
              )}
              {user && (
                <Button
                  variant="ghost"
                  className="justify-start gap-2 text-muted-foreground"
                  onClick={() => { setMenuOpen(false); signOut(); }}
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <FeedbackForm open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
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
          <h2 className="text-muted-foreground font-body text-lg max-w-md mx-auto font-normal">
            Spot spaghetti code in any GitHub repo. Paste a URL and get an instant AI-powered code-quality score.
          </h2>
          {user && !isPro && remainingAnalyses !== null && (
            <p className="text-xs text-muted-foreground font-body">
              {remainingAnalyses} of 3 free analyses left this week ·{" "}
              <Link to="/pricing" className="text-primary hover:underline">Go Pro for unlimited</Link>
            </p>
          )}
          {isPro && (
            <p className="text-xs text-primary font-body inline-flex items-center justify-center gap-1">
              <Crown className="w-3 h-3" /> Pro · unlimited analyses
            </p>
          )}
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

        {/* Repo browser */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <RepoSelector onSelect={(url) => setRepoUrl(url)} />
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
            <div className="space-y-4">
              <AnalysisResults result={result} repoUrl={repoUrl} shareId={shareId} />
              <div className="flex justify-center">
                <Button
                  variant={saved ? "outline" : "spaghettify"}
                  onClick={handleSaveToDashboard}
                  disabled={saving || saved}
                >
                  <Bookmark className="w-4 h-4 mr-2" />
                  {saved ? "Saved to dashboard" : saving ? "Saving…" : "Save to dashboard"}
                </Button>
              </div>
              {!isPro && user && savedLimit !== null && savedCount >= savedLimit && !saved && (
                <p className="text-center text-xs text-muted-foreground">
                  Free plan allows {savedLimit} saved analysis.{" "}
                  <Link to="/pricing" className="text-primary hover:underline">Upgrade to Pro</Link>
                </p>
              )}
            </div>
          )}
        </AnimatePresence>

        {/* Knowledge base manager */}
        <div className="pt-8 border-t border-border">
          <KnowledgeManager />
        </div>
      </div>

      {/* SEO content sections */}
      <section className="container max-w-3xl mx-auto px-4 py-12 space-y-12">
        <article className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            What is spaghetti code?
          </h2>
          <p className="text-muted-foreground font-body leading-relaxed">
            Spaghetti code is source code that is tangled, hard to follow, and difficult to maintain — full of
            twisted control flow, deep nesting, duplicated logic, and unclear responsibilities. Just like a plate
            of spaghetti, you can't pull on one strand without disturbing all the others. Spaghetti code slows
            teams down, hides bugs, and makes onboarding new developers painful.
          </p>
          <p className="text-muted-foreground font-body leading-relaxed">
            <strong className="text-foreground">SpaghettiMeter</strong> is a free tool that uses AI to scan any
            public or private GitHub repository, score its code quality on a 0–10 scale, and generate concrete,
            actionable refactoring suggestions you can apply today.
          </p>
        </article>

        <article className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            How it works
          </h2>
          <ol className="space-y-3 font-body text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>
              <strong className="text-foreground">Paste a GitHub URL</strong> — or connect your GitHub account
              to browse and analyse private repos.
            </li>
            <li>
              <strong className="text-foreground">We fetch and analyse your code</strong> — language detection,
              file structure, complexity, naming, duplication, and architectural smells.
            </li>
            <li>
              <strong className="text-foreground">You get a spaghetti score</strong> — from 0 (al dente) to 10
              (full pasta disaster), with a category breakdown and prioritised refactoring suggestions.
            </li>
            <li>
              <strong className="text-foreground">Share the result</strong> — every analysis gets a public link
              you can post to LinkedIn, X, or send to your team.
            </li>
          </ol>
        </article>

        <article className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Frequently asked questions
          </h2>
          <div className="space-y-5">
            <div>
              <h3 className="font-display font-semibold text-foreground">Is SpaghettiMeter free?</h3>
              <p className="text-muted-foreground font-body mt-1">
                Yes — SpaghettiMeter is free to use for both public and private GitHub repositories.
              </p>
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">Can I analyse private repos?</h3>
              <p className="text-muted-foreground font-body mt-1">
                Yes. Connect your GitHub account with a personal access token and you'll be able to scan any
                repository you have access to, public or private.
              </p>
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">Which languages are supported?</h3>
              <p className="text-muted-foreground font-body mt-1">
                SpaghettiMeter works with every popular language — TypeScript, JavaScript, Python, Go, Rust,
                Java, C#, Ruby, PHP, Kotlin, Swift, C, C++ and more.
              </p>
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">Do you store my source code?</h3>
              <p className="text-muted-foreground font-body mt-1">
                No. We fetch the files only to run the analysis, then discard them. Only the score, summary
                and suggestions are stored when you choose to share the result.
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* Footer */}
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

export default Index;
