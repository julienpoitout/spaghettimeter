import { motion } from "framer-motion";

interface SpaghettiMeterProps {
  score: number; // 0.1 to 10.0
}

const getColor = (score: number) => {
  if (score <= 3) return "hsl(var(--spaghetti-green))";
  if (score <= 6) return "hsl(var(--spaghetti-yellow))";
  return "hsl(var(--spaghetti-red))";
};

const getLabel = (score: number) => {
  if (score <= 2) return "Clean Pasta 🍝";
  if (score <= 4) return "Slightly Tangled 🍜";
  if (score <= 6) return "Getting Messy 😬";
  if (score <= 8) return "Full Spaghetti 🍝💀";
  return "Mamma Mia! 🤌💥";
};

const SpaghettiMeter = ({ score }: SpaghettiMeterProps) => {
  const percentage = (score / 10) * 100;
  const color = getColor(score);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Circular gauge */}
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          {/* Background arc */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${Math.PI * 160 * 0.75} ${Math.PI * 160 * 0.25}`}
            strokeDashoffset={0}
          />
          {/* Score arc */}
          <motion.circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${Math.PI * 160 * 0.75} ${Math.PI * 160 * 0.25}`}
            initial={{ strokeDashoffset: Math.PI * 160 * 0.75 }}
            animate={{ strokeDashoffset: Math.PI * 160 * 0.75 * (1 - percentage / 100) }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-4xl font-display font-bold"
            style={{ color }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            {score.toFixed(1)}
          </motion.span>
          <span className="text-xs text-muted-foreground font-body">/ 10.0</span>
        </div>
      </div>

      {/* Label */}
      <motion.p
        className="text-xl font-display font-semibold text-center"
        style={{ color }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        {getLabel(score)}
      </motion.p>
    </div>
  );
};

export default SpaghettiMeter;
