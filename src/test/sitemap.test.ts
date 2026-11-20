import { describe, expect, it } from "vitest";
import { buildSitemap, loadAllSharedAnalyses, PAGE_SIZE } from "../../supabase/functions/sitemap/sitemap";

describe("public sitemap coverage", () => {
  it("includes one concrete shared-analysis URL per row", () => {
    const xml = buildSitemap([
      { id: "first", created_at: "2026-11-19T11:47:35.621Z" },
      { id: "second", created_at: "2026-11-18T11:47:35.621Z" },
    ]);
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const urls = Array.from(doc.querySelectorAll("loc"), (el) => el.textContent);
    expect(urls).toEqual([
      "https://spaghettimeter.com/", "https://spaghettimeter.com/pricing",
      "https://spaghettimeter.com/learn/what-is-spaghetti-code",
      "https://spaghettimeter.com/s/first", "https://spaghettimeter.com/s/second",
    ]);
  });

  it("excludes private, token-only and noindex routes", () => {
    const urls = Array.from(new DOMParser().parseFromString(buildSitemap([]), "application/xml").querySelectorAll("loc"), (el) => el.textContent);
    for (const path of ["/auth", "/unsubscribe", "/dashboard", "/billing", "/analysis/private-id", "/s/:id"]) {
      expect(urls).not.toContain(`https://spaghettimeter.com${path}`);
    }
  });

  it("keeps real creation timestamps and omits invalid or static fallback dates", () => {
    const doc = new DOMParser().parseFromString(buildSitemap([
      { id: "first", created_at: "2026-11-19T11:47:35.621Z" },
      { id: "second", created_at: "invalid" },
    ]), "application/xml");
    expect(Array.from(doc.querySelectorAll("lastmod"), (el) => el.textContent)).toEqual(["2026-11-19T11:47:35.621Z"]);
  });

  it("fetches every row beyond database page limits", async () => {
    const rows = Array.from({ length: 6001 }, (_, id) => ({ id: String(id), created_at: "2026-11-19T11:47:35.621Z" }));
    const pages: number[] = [];
    const result = await loadAllSharedAnalyses(async (from, to) => {
      expect(to - from + 1).toBe(PAGE_SIZE);
      pages.push(from);
      return rows.slice(from, to + 1);
    });
    expect(result).toEqual(rows);
    expect(pages).toEqual([0, 1000, 2000, 3000, 4000, 5000, 6000]);
  });
});