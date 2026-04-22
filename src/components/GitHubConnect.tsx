import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useGitHubToken } from "@/hooks/useGitHubToken";
import { Github, X, ExternalLink, CheckCircle2, ShieldAlert } from "lucide-react";

const TOKEN_CREATE_URL =
  "https://github.com/settings/personal-access-tokens/new?name=SpaghettiMeter&description=Read-only%20access%20for%20SpaghettiMeter%20analysis";

const GitHubConnect = () => {
  const { token, setToken, clearToken, isConnected } = useGitHubToken();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [validating, setValidating] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      toast({ title: "Paste your GitHub token", variant: "destructive" });
      return;
    }
    setValidating(true);
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${trimmed}`, "User-Agent": "SpaghettiMeter" },
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Invalid token" : `GitHub error (${res.status})`);
      }
      const user = await res.json();
      setToken(trimmed);
      setInput("");
      setOpen(false);
      toast({ title: `Connected as ${user.login} 🎉` });
    } catch (err: any) {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  const handleDisconnect = () => {
    clearToken();
    toast({ title: "GitHub disconnected" });
  };

  return (
    <>
      {isConnected ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          className="gap-2 text-muted-foreground"
          title="Disconnect GitHub"
        >
          <CheckCircle2 className="w-4 h-4 text-primary" />
          GitHub connected
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-2 text-muted-foreground hover:text-primary"
        >
          <Github className="w-4 h-4" /> Connect GitHub
        </Button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                  <Github className="w-5 h-5" /> Connect GitHub
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-sm font-body text-muted-foreground mb-4">
                To analyze your <strong>private repos</strong>, paste a GitHub Personal Access Token. Public-only? You can skip this.
              </p>

              <div className="rounded-md border border-border bg-muted/30 p-4 mb-4 space-y-2">
                <p className="text-sm font-body font-semibold text-foreground">How to create a token:</p>
                <ol className="text-sm font-body text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>
                    Open{" "}
                    <a
                      href={TOKEN_CREATE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      GitHub's token page <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Choose <strong>Fine-grained token</strong>, select the repos you want to analyze</li>
                  <li>Under <strong>Repository permissions</strong>, set <strong>Contents</strong> → <strong>Read-only</strong></li>
                  <li>Generate, copy the token, and paste it below</li>
                </ol>
              </div>

              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 mb-4 flex gap-2">
                <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs font-body text-muted-foreground">
                  Your token is stored <strong>only in your browser</strong> and sent to our analysis function over HTTPS. It is never saved in our database.
                </p>
              </div>

              <div className="space-y-2 mb-4">
                <Label htmlFor="gh-token">Personal Access Token</Label>
                <Input
                  id="gh-token"
                  type="password"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="github_pat_..."
                  onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleConnect} disabled={validating || !input.trim()} className="flex-1">
                  {validating ? "Validating..." : "Connect"}
                </Button>
                {token && (
                  <Button variant="outline" onClick={() => { handleDisconnect(); setOpen(false); }}>
                    Disconnect
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GitHubConnect;