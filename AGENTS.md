# Architecture rules

- Keep the static public sitemap and the robots-advertised Cloud sitemap; the latter paginates shared_analyses and renders XML through a pure tested helper so public results remain discoverable beyond database row limits.
- Include only public indexable URLs in sitemaps; account, saved-analysis and token-only pages must stay excluded to avoid exposing private URLs or advertising noindex pages.