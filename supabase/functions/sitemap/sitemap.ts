export interface SharedAnalysisRow {
  id: string;
  created_at: string;
}

const SITE_URL = "https://spaghettimeter.com";
export const PAGE_SIZE = 1000;

export async function loadAllSharedAnalyses(
  fetchPage: (from: number, to: number) => Promise<SharedAnalysisRow[]>,
): Promise<SharedAnalysisRow[]> {
  const rows: SharedAnalysisRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await fetchPage(from, from + PAGE_SIZE - 1);
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (char) => {
  const entities: Record<string, string> = {
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  };
  return entities[char];
});

export function buildSitemap(rows: SharedAnalysisRow[]): string {
  const urls: { loc: string; lastmod?: string }[] = [
    { loc: `${SITE_URL}/` },
    { loc: `${SITE_URL}/pricing` },
    { loc: `${SITE_URL}/learn/what-is-spaghetti-code` },
    ...rows.map((row) => {
      const timestamp = new Date(row.created_at);
      return {
        loc: `${SITE_URL}/s/${encodeURIComponent(row.id)}`,
        // Creation is an authoritative, page-specific content timestamp.
        lastmod: Number.isNaN(timestamp.getTime()) ? undefined : timestamp.toISOString(),
      };
    }),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${escapeXml(url.loc)}</loc>${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>`;
}