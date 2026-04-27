import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw, Trash2, Crown, CreditCard, Receipt, ArrowUpDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { useGitHubToken } from "@/hooks/useGitHubToken";
import Seo from "@/components/Seo";
import { getStripeEnvironment } from "@/lib/stripe";

interface SavedAnalysis {
  id: string;
  repo_url: string;
  score: number;
  summary: string | null;
  breakdown: any[];
  suggestions: any[];
  created_at: string;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isPro } = useSubscription();
  const { token } = useGitHubToken();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<{ a: string | null; b: string | null }>({ a: null, b: null });
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?next=/dashboard");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast({ title: "Welcome to Pro 🎉", description: "Your subscription is active." });
    }
  }, [searchParams, toast]);

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/dashboard`,
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Failed to open billing portal");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast({
        title: "Could not open billing portal",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const fetchAnalyses = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load saved analyses:", error);
      toast({
        title: "Couldn't load your dashboard",
        description: error.message,
        variant: "destructive",
      });
    }
    setAnalyses((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    fetchAnalyses();
  }, [user, authLoading]);

  const repoGroups = useMemo(() => {
    const map = new Map<string, SavedAnalysis[]>();
    analyses.forEach((a) => {
      const list = map.get(a.repo_url) || [];
      list.push(a);
      map.set(a.repo_url, list);
    });
    return map;
  }, [analyses]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("saved_analyses").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleReanalyze = async (analysis: SavedAnalysis) => {
    setReanalyzing(analysis.id);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-repo", {
        body: { repoUrl: analysis.repo_url, githubToken: token || undefined },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Analysis failed");

      const r = data.result;
      const { error: saveError } = await supabase.functions.invoke("save-analysis", {
        body: {
          repoUrl: analysis.repo_url,
          score: r.score,
          summary: r.summary || r.explanation || "",
          breakdown: r.breakdown || [],
          suggestions: r.suggestions || [],
        },
      });
      if (saveError) throw saveError;
      toast({ title: "Re-analysis saved 🍝" });
      await fetchAnalyses();
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("limit") || msg.includes("Upgrade")) {
        toast({
          title: "Limit reached",
          description: "Upgrade to Pro for unlimited analyses & saves.",
          variant: "destructive",
        });
        navigate("/pricing");
      } else {
        toast({ title: "Re-analysis failed", description: msg, variant: "destructive" });
      }
    } finally {
      setReanalyzing(null);
    }
  };

  const compareA = analyses.find((a) => a.id === compareIds.a);
  const compareB = analyses.find((a) => a.id === compareIds.b);

  // While auth is resolving (or we know there's no user and we're about to
  // redirect), show a centered branded loader instead of the dashboard chrome
  // to avoid a flash of empty UI.
  if (authLoading || !user) {
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
          <p className="font-display text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Your Dashboard — SpaghettiMeter" description="Saved code-quality analyses, score-over-time charts and side-by-side comparisons." canonical="https://spaghettimeter.com/dashboard" />
      <div className="container max-w-6xl mx-auto px-4 py-10 space-y-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="w-4 h-4" /> Back to scanner
          </Link>
          {!isPro && (
            <Button variant="spaghettify" size="sm" onClick={() => navigate("/pricing")}>
              <Crown className="w-4 h-4 mr-1" /> Upgrade to Pro
            </Button>
          )}
        </div>

        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">Your saved analyses</h1>
          <p className="text-muted-foreground font-body mt-2">
            {isPro ? "Unlimited saves — track code quality across all your repos." : "Free plan: 1 saved analysis."}
          </p>
        </div>

        {/* Manage subscription */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Manage your subscription
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                {isPro
                  ? "You're on the Pro plan. Use the billing portal to make changes."
                  : "You're on the Free plan. Upgrade to Pro for unlimited analyses, saves, and history."}
              </p>
            </div>
            {isPro ? (
              <Button variant="spaghettify" onClick={openBillingPortal} disabled={portalLoading} className="gap-2">
                Open billing portal
                <ExternalLink className="w-4 h-4" />
              </Button>
            ) : (
              <Button variant="spaghettify" onClick={() => navigate("/pricing")} className="gap-2">
                <Crown className="w-4 h-4" /> Upgrade to Pro
              </Button>
            )}
          </div>

          {isPro && (
            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg border border-border bg-background p-4 flex items-start gap-3">
                <ArrowUpDown className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-display font-semibold text-sm">Upgrade or downgrade</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">Switch plans or cancel anytime.</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background p-4 flex items-start gap-3">
                <Receipt className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-display font-semibold text-sm">Download receipts</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">Access invoices and payment history.</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background p-4 flex items-start gap-3">
                <CreditCard className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-display font-semibold text-sm">Update payment</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">Change card or billing details.</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Score over time per repo */}
        {repoGroups.size > 0 && (
          <section className="space-y-6">
            <h2 className="text-xl font-display font-bold">Score over time</h2>
            {Array.from(repoGroups.entries()).map(([repo, list]) => {
              const sorted = [...list].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
              );
              if (sorted.length < 2) return null;
              const data = sorted.map((s) => ({
                date: new Date(s.created_at).toLocaleDateString(),
                score: Number(s.score),
              }));
              return (
                <div key={repo} className="rounded-xl border border-border bg-card p-4">
                  <p className="font-display font-semibold text-sm mb-3 truncate">{repo}</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                          }}
                        />
                        <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Compare two analyses */}
        {analyses.length >= 2 && (
          <section className="space-y-4">
            <h2 className="text-xl font-display font-bold">Compare two analyses</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Select value={compareIds.a || ""} onValueChange={(v) => setCompareIds((p) => ({ ...p, a: v }))}>
                <SelectTrigger><SelectValue placeholder="Pick analysis A" /></SelectTrigger>
                <SelectContent>
                  {analyses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.repo_url.replace("https://github.com/", "")} — {Number(a.score).toFixed(1)} ({new Date(a.created_at).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={compareIds.b || ""} onValueChange={(v) => setCompareIds((p) => ({ ...p, b: v }))}>
                <SelectTrigger><SelectValue placeholder="Pick analysis B" /></SelectTrigger>
                <SelectContent>
                  {analyses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.repo_url.replace("https://github.com/", "")} — {Number(a.score).toFixed(1)} ({new Date(a.created_at).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {compareA && compareB && (
              <div className="grid md:grid-cols-2 gap-4">
                {[compareA, compareB].map((a, i) => (
                  <div key={a.id} className="rounded-xl border border-border bg-card p-5 space-y-2">
                    <p className="text-xs uppercase font-display text-muted-foreground">Analysis {i === 0 ? "A" : "B"}</p>
                    <p className="font-display font-semibold truncate">{a.repo_url.replace("https://github.com/", "")}</p>
                    <p className="text-3xl font-display font-bold text-primary">{Number(a.score).toFixed(1)}<span className="text-base text-muted-foreground">/10</span></p>
                    <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                    {a.summary && <p className="text-sm font-body text-muted-foreground line-clamp-4">{a.summary}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* History list */}
        <section className="space-y-3">
          <h2 className="text-xl font-display font-bold">History</h2>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-2"
              >
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-9 w-20" />
                      <Skeleton className="h-9 w-9" />
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : analyses.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="rounded-xl border border-dashed border-border p-10 text-center"
              >
                <p className="text-muted-foreground font-body">No saved analyses yet.</p>
                <Button variant="spaghettify" onClick={() => navigate("/")} className="mt-4">
                  Run your first analysis
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="space-y-2"
              >
                {analyses.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-semibold truncate">{a.repo_url.replace("https://github.com/", "")}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-2xl font-display font-bold text-primary">
                      {Number(a.score).toFixed(1)}
                      <span className="text-sm text-muted-foreground">/10</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleReanalyze(a)} disabled={reanalyzing === a.id}>
                        <RefreshCw className={`w-4 h-4 mr-1 ${reanalyzing === a.id ? "animate-spin" : ""}`} />
                        Re-run
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;