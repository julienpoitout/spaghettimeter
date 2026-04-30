import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Trash2, Plus, BookOpen, Upload, FileText, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  file_url: string | null;
}

const KnowledgeManager = () => {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const uploadFile = async (): Promise<string | null> => {
    if (!file) return null;
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("knowledge-docs")
      .upload(path, file);
    if (error) {
      toast({ title: "File upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    return path;
  };

  const addItem = async () => {
    if (!title.trim() || (!content.trim() && !file)) {
      toast({ title: "Please fill in title and either content or upload a file", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const filePath = await uploadFile();

      const { error } = await supabase
        .from("spaghetti_knowledge")
        .insert({
          title: title.trim(),
          content: content.trim() || `[Document: ${file?.name}]`,
          category,
          file_url: filePath,
        });

      if (error) {
        toast({ title: "Error adding knowledge", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "Knowledge added! 🧠" });
      setTitle("");
      setContent("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchItems();
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (item: KnowledgeItem) => {
    if (item.file_url) {
      await supabase.storage.from("knowledge-docs").remove([item.file_url]);
    }
    const { error } = await supabase.from("spaghetti_knowledge").delete().eq("id", item.id);
    if (error) {
      toast({ title: "Error deleting", variant: "destructive" });
      return;
    }
    fetchItems();
  };

  // Restrict Knowledge Base visibility to a single allowlisted email
  if (user?.email?.toLowerCase() !== "julienpoitout@gmail.com") {
    return null;
  }

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
            Upload documents or enter text directly.
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

            {/* File upload */}
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {file ? file.name : "Upload Document"}
              </Button>
              {file && (
                <button
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
              )}
            </div>

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
              <Button onClick={addItem} disabled={uploading} className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> {uploading ? "Adding..." : "Add"}
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
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm font-display truncate">{item.title}</p>
                    {item.file_url && <FileText className="w-3 h-3 text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.content}</p>
                  <span className="text-xs text-accent font-medium">{item.category}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteItem(item)}
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
