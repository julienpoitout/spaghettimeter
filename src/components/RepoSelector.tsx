import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Star, GitFork, ChevronRight, Lock, Globe } from "lucide-react";
import { useGitHubToken } from "@/hooks/useGitHubToken";

interface Repo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  private: boolean;
}

interface RepoSelectorProps {
  onSelect: (repoUrl: string) => void;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
};

const RepoSelector = ({ onSelect }: RepoSelectorProps) => {
  const [username, setUsername] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const { token, isConnected } = useGitHubToken();

  const fetchRepos = useCallback(async () => {
    if (!isConnected && !username.trim()) return;
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const url = isConnected
        ? `https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&sort=updated&per_page=100`
        : `https://api.github.com/users/${encodeURIComponent(username.trim())}/repos?sort=updated&per_page=30`;
      const headers: Record<string, string> = { "User-Agent": "SpaghettiMeter" };
      if (isConnected && token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        if (res.status === 404) throw new Error("User not found");
        if (res.status === 401) throw new Error("Invalid GitHub token. Reconnect.");
        if (res.status === 403) throw new Error("Rate limit exceeded. Try again later.");
        throw new Error("Failed to fetch repos");
      }
      const data: Repo[] = await res.json();
      setRepos(data);
    } catch (err: any) {
      setError(err.message);
      setRepos([]);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, token, username]);

  // Auto-load repos as soon as a GitHub token is connected
  useEffect(() => {
    if (isConnected) {
      fetchRepos();
    } else {
      setRepos([]);
      setHasSearched(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, token]);

  return (
    <div className="space-y-3">
      <p className="text-sm font-body text-muted-foreground">
        {isConnected
          ? "Browse your repos (public + private):"
          : "Or browse public repos by GitHub username:"}
      </p>
      <div className="flex gap-2">
        {!isConnected && (
          <Input
            placeholder="GitHub username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchRepos()}
            className="flex-1 h-10 text-sm font-body"
          />
        )}
        <Button
          variant="outline"
          size="default"
          onClick={fetchRepos}
          disabled={isLoading || (!isConnected && !username.trim())}
          className={isConnected ? "gap-1.5 w-full" : "gap-1.5"}
        >
          <Search className="w-4 h-4" />
          {isLoading ? "Loading..." : isConnected ? "Browse my repos" : "Browse"}
        </Button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            className="text-sm text-destructive font-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {repos.length > 0 && (
          <motion.div
            className="max-h-64 overflow-y-auto rounded-lg border border-border bg-card space-y-0 divide-y divide-border"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {repos.map((repo, i) => (
              <motion.button
                key={repo.id}
                className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-3 group"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onSelect(repo.html_url)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-semibold text-foreground truncate">
                      {repo.name}
                    </span>
                    <span
                      className={`flex items-center gap-0.5 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${
                        repo.private
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {repo.private ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                      {repo.private ? "Private" : "Public"}
                    </span>
                    {repo.language && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: LANGUAGE_COLORS[repo.language] || "hsl(var(--muted-foreground))" }}
                        />
                        {repo.language}
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {repo.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                  {repo.stargazers_count > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3" /> {repo.stargazers_count}
                    </span>
                  )}
                  {repo.forks_count > 0 && (
                    <span className="flex items-center gap-0.5">
                      <GitFork className="w-3 h-3" /> {repo.forks_count}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {hasSearched && !isLoading && !error && repos.length === 0 && (
        <p className="text-sm text-muted-foreground font-body">No public repos found.</p>
      )}
    </div>
  );
};

export default RepoSelector;
