import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, BookOpen } from "lucide-react";

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
}

const KnowledgeManager = () => {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("spaghetti_knowledge")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching knowledge:", error);
      return;
    }
    setItems(data || []);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const addItem = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: "Please fill in both title and content", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("spaghetti_knowledge")
      .insert({ title: title.trim(), content: content.trim(), category });
    if (error) {
      toast({ title: "Error adding knowledge", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Knowledge added! 🧠" });
    setTitle("");
    setContent("");
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("spaghetti_knowledge").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting", variant: "destructive" });
      return;
    }
    fetchItems();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 font-display text-muted-foreground hover:text-foreground"
      >
        <BookOpen className="w-4 h-4" />
        Knowledge Base ({items.length} entries)
      </Button>

      {isOpen && (
        <Card className="mt-3 p-5 bg-card space-y-4">
          <h3 className="font-display text-lg font-semibold">
            Feed the Spaghetti Detective 🕵️
          </h3>
          <p className="text-sm text-muted-foreground font-body">
            Add coding best practices, anti-patterns, and spaghetti code characteristics.
            The AI agent will use this knowledge during analysis.
          </p>

          <div className="space-y-3">
            <Input
              placeholder="Title (e.g., 'God Object Anti-Pattern')"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Content — describe the pattern, why it's bad, how to fix it..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="general">General</option>
                <option value="anti-patterns">Anti-Patterns</option>
                <option value="best-practices">Best Practices</option>
                <option value="architecture">Architecture</option>
              </select>
              <Button onClick={addItem} className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm font-display truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.content}</p>
                  <span className="text-xs text-accent font-medium">{item.category}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteItem(item.id)}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No knowledge added yet. The AI will use its default understanding of code quality.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default KnowledgeManager;
