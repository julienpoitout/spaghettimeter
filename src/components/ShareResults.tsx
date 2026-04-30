import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link, Mail, Share2 } from "lucide-react";

interface ShareResultsProps {
  score: number;
  repoUrl: string;
  shareId?: string | null;
}

const ShareResults = ({ score, repoUrl, shareId }: ShareResultsProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const repoName = repoUrl.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  const shareText = `🍝 My repo "${repoName}" scored ${score.toFixed(1)}/10 on SpaghettiMeter! How tangled is YOUR code?`;
  const shareUrl = shareId ? `${window.location.origin}/s/${shareId}` : null;
  const fullText = `${shareText}\n${shareUrl}`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl ?? "");

  const channels = [
    {
      name: "LinkedIn",
      icon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&summary=${encodedText}`,
    },
    {
      name: "Facebook",
      icon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    },
    {
      name: "WhatsApp",
      icon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      url: `https://wa.me/?text=${encodeURIComponent(fullText)}`,
    },
    {
      name: "Email",
      icon: () => <Mail className="w-5 h-5" />,
      url: `mailto:?subject=${encodeURIComponent("Check out my SpaghettiMeter score!")}&body=${encodeURIComponent(fullText)}`,
    },
  ];

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copied to clipboard! 📋" });
  };

  // Don't render share UI until we have a shareable link to the analysis
  if (!shareUrl) return null;

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2 }}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Share2 className="w-4 h-4" /> Share your score
      </Button>

      {isOpen && (
        <motion.div
          className="flex flex-wrap justify-center gap-2"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {channels.map((ch) => (
            <Button
              key={ch.name}
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => window.open(ch.url, "_blank", "noopener,noreferrer")}
            >
              <ch.icon />
              {ch.name}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={copyLink}
          >
            <Link className="w-5 h-5" />
            Link
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ShareResults;
