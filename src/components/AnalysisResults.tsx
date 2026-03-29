import { motion } from "framer-motion";
import SpaghettiMeter from "./SpaghettiMeter";
import ShareResults from "./ShareResults";
import { Card } from "@/components/ui/card";

export interface AnalysisResult {
  score: number;
  explanation: string;
  suggestions: string[];
}

interface AnalysisResultsProps {
  result: AnalysisResult;
  repoUrl: string;
}

const AnalysisResults = ({ result, repoUrl }: AnalysisResultsProps) => {
  return (
    <motion.div
      className="w-full max-w-2xl mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Repo name */}
      <motion.p
        className="text-center text-muted-foreground font-body text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Analyzing: <span className="font-semibold text-foreground">{repoUrl}</span>
      </motion.p>

      {/* Score */}
      <SpaghettiMeter score={result.score} />

      {/* Explanation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
      >
        <Card className="p-6 bg-card">
          <h3 className="font-display text-lg font-semibold mb-3 text-foreground">
            🔍 Analysis
          </h3>
          <p className="text-muted-foreground font-body leading-relaxed">
            {result.explanation}
          </p>
        </Card>
      </motion.div>

      {/* Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
      >
        <Card className="p-6 bg-card">
          <h3 className="font-display text-lg font-semibold mb-3 text-foreground">
            🧹 How to De-Spaghettify
          </h3>
          <ul className="space-y-3">
            {result.suggestions.map((suggestion, index) => (
              <motion.li
                key={index}
                className="flex items-start gap-3 text-muted-foreground font-body"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.8 + index * 0.1 }}
              >
                <span className="text-accent font-bold shrink-0">
                  {index + 1}.
                </span>
                <span className="leading-relaxed">{suggestion}</span>
              </motion.li>
            ))}
          </ul>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default AnalysisResults;
