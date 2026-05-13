import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft } from "lucide-react";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { articles } from "@/content/articles";
import NotFound from "./NotFound";

const SITE_URL = "https://spaghettimeter.com";

const LearnArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? articles[slug] : undefined;

  if (!article) return <NotFound />;

  const canonical = `${SITE_URL}/learn/${article.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.dateModified ?? article.datePublished,
    author: { "@type": "Organization", name: "SpaghettiMeter" },
    publisher: {
      "@type": "Organization",
      name: "SpaghettiMeter",
      url: SITE_URL,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    image: `${SITE_URL}/og-image.png`,
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${article.title} | SpaghettiMeter`}
        description={article.description}
        canonical={canonical}
        ogType="article"
        ogImage={`${SITE_URL}/og-image.png`}
        jsonLd={jsonLd}
      />

      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-xl font-bold text-primary">
            SpaghettiMeter 🍝
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back home
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="mb-3 text-sm text-muted-foreground">
          <time dateTime={article.datePublished}>
            {new Date(article.datePublished).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span className="mx-2">·</span>
          {article.readingTime}
        </p>

        <article className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-display prose-h1:text-4xl prose-a:text-primary prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body}</ReactMarkdown>
        </article>

        <div className="mt-16 rounded-lg border border-border bg-card p-6 text-center">
          <h2 className="mb-2 font-display text-2xl font-bold">
            Find out how tangled your code really is
          </h2>
          <p className="mb-4 text-muted-foreground">
            Get an AI-powered spaghetti score for any public GitHub repo in under a minute.
          </p>
          <Button asChild size="lg">
            <Link to="/">Scan a repo</Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default LearnArticle;