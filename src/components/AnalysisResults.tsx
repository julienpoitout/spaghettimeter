import { motion } from "framer-motion";
import SpaghettiMeter from "./SpaghettiMeter";
import ShareResults from "./ShareResults";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, AlertCircle, ListChecks } from "lucide-react";

export interface SuggestionItem {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

export interface BreakdownItem {
  category: string;
  rating: "excellent" | "good" | "mediocre" | "poor" | "terrible";
  observation: string;
}

export interface AnalysisResult {
  score: number;
  summary?: string;
  explanation?: string; // legacy
  breakdown?: BreakdownItem[];
  suggestions: (SuggestionItem | string)[];
}

interface AnalysisResultsProps {
  result: AnalysisResult;
  repoUrl: string;
  shareId?: string | null;
}

const RATING_STYLES: Record<BreakdownItem["rating"], { color: string; emoji: string }> = {
  excellent: { color: "bg-primary/15 text-primary border-primary/30", emoji: "🌟" },
  good: { color: "bg-primary/10 text-primary border-primary/20", emoji: "✅" },
  mediocre: { color: "bg-accent/15 text-accent-foreground border-accent/30", emoji: "⚖️" },
  poor: { color: "bg-destructive/10 text-destructive border-destructive/20", emoji: "⚠️" },
  terrible: { color: "bg-destructive/20 text-destructive border-destructive/40", emoji: "🚨" },
};

const PRIORITY_STYLES: Record<SuggestionItem["priority"], { label: string; className: string; Icon: typeof AlertCircle }> = {
  high: { label: "High priority", className: "bg-destructive/10 text-destructive border-destructive/30", Icon: AlertCircle },
  medium: { label: "Medium", className: "bg-accent/15 text-accent-foreground border-accent/30", Icon: AlertTriangle },
  low: { label: "Nice to have", className: "bg-muted text-muted-foreground border-border", Icon: CheckCircle2 },
};

const normalizeSuggestion = (s: SuggestionItem | string): SuggestionItem =>
  typeof s === "string"
    ? { title: s.length > 60 ? s.slice(0, 60) + "…" : s, detail: s, priority: "medium" }
    : { title: s.title, detail: s.detail, priority: s.priority || "medium" };

const AnalysisResults = ({ result, repoUrl, shareId }: AnalysisResultsProps) => {
  const summary = result.summary || result.explanation || "";
  const breakdown = result.breakdown || [];
  const suggestions = (result.suggestions || []).map(normalizeSuggestion);

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.p
        className="text-center text-muted-foreground font-body text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Analyzing: <span className="font-semibold text-foreground">{repoUrl}</span>
      </motion.p>

      <SpaghettiMeter score={result.score} />

      {/* Verdict */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
        >
          <Card className="p-6 bg-card">
            <h3 className="font-display text-lg font-semibold mb-3 text-foreground">
              🍝 The Verdict
            </h3>
            <p className="text-muted-foreground font-body leading-relaxed">{summary}</p>
          </Card>
        </motion.div>
      )}

      {/* Breakdown */}
      {breakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.55 }}
        >
          <Card className="p-6 bg-card">
            <h3 className="font-display text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
              <ListChecks className="w-5 h-5" /> Breakdown by Category
            </h3>
            <div className="space-y-4">
              {breakdown.map((item, i) => {
                const style = RATING_STYLES[item.rating] || RATING_STYLES.mediocre;
                return (
                  <motion.div
                    key={i}
                    className="border border-border rounded-lg p-4 bg-background/30"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.7 + i * 0.08 }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="font-display font-semibold text-foreground text-sm">
                        {item.category}
                      </h4>
                      <Badge className={`${style.color} border font-body text-xs capitalize`} variant="outline">
                        {style.emoji} {item.rating}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">
                      {item.observation}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7 }}
        >
          <Card className="p-6 bg-card">
            <h3 className="font-display text-lg font-semibold mb-4 text-foreground">
              🧹 How to De-Spaghettify
            </h3>
            <ul className="space-y-3">
              {suggestions.map((s, i) => {
                const ps = PRIORITY_STYLES[s.priority] || PRIORITY_STYLES.medium;
                const Icon = ps.Icon;
                return (
                  <motion.li
                    key={i}
                    className="border border-border rounded-lg p-4 bg-background/30"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.9 + i * 0.08 }}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                          <h4 className="font-display font-semibold text-foreground text-sm">
                            {s.title}
                          </h4>
                          <Badge className={`${ps.className} border font-body text-xs`} variant="outline">
                            {ps.label}
                          </Badge>
                        </div>
                        {s.detail && (
                          <p className="text-sm text-muted-foreground font-body leading-relaxed">
                            {s.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </Card>
        </motion.div>
      )}

      <ShareResults score={result.score} repoUrl={repoUrl} shareId={shareId} />
    </motion.div>
  );
};

export default AnalysisResults;
