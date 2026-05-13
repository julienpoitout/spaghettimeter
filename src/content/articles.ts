import whatIsSpaghettiCode from "./what-is-spaghetti-code.md?raw";

export interface Article {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  readingTime: string;
  body: string;
}

export const articles: Record<string, Article> = {
  "what-is-spaghetti-code": {
    slug: "what-is-spaghetti-code",
    title: "What Is Spaghetti Code? Examples, Causes, and How to Fix It",
    description:
      "Spaghetti code is tangled, hard-to-follow source code with no clear structure. Learn what causes it, see real examples, and discover how to refactor it.",
    datePublished: "2026-05-13",
    readingTime: "8 min read",
    body: whatIsSpaghettiCode,
  },
};

export const articleList = Object.values(articles);