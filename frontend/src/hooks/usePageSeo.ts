/**
 * usePageSeo — single hook to set:
 *   - document.title
 *   - <meta name="description">, keywords, robots
 *   - Open Graph (type, url, title, description, image + width/height/alt)
 *   - Twitter Card (summary_large_image)
 *   - <link rel="canonical">
 *   - JSON-LD BreadcrumbList (with the home → section → page chain)
 *   - Optional JSON-LD Article + FAQPage payloads
 *
 * Designed to be called once per page in useEffect.
 * All injected nodes are tagged with `data-seo="<page-id>"` for surgical cleanup
 * on unmount, so we never leak stale meta between SPA navigations.
 */
import { useEffect } from 'react';

export interface BreadcrumbItem {
  name: string;
  url:  string;       // absolute URL ("https://greenconnect.cloud/...")
}

export interface UsePageSeoOptions {
  id: string;                                  // unique key for cleanup tagging
  title: string;                               // document.title
  description: string;
  keywords?: string;
  url: string;                                 // canonical URL (absolute)
  ogType?: 'website' | 'article';
  ogTitle?: string;                            // defaults to title
  ogDescription?: string;                      // defaults to description
  ogImage?: string;                            // absolute URL (defaults to /api/v1/og/default.png)
  ogImageWidth?: number;                       // defaults to 1200
  ogImageHeight?: number;                      // defaults to 630
  ogImageAlt?: string;                         // defaults to title
  robots?: string;                             // e.g. "noindex,nofollow"
  breadcrumb?: BreadcrumbItem[];               // home → section → page
  articleJsonLd?: Record<string, unknown>;     // Schema.org Article payload
  faqJsonLd?: Record<string, unknown>;         // Schema.org FAQPage payload
}

const DEFAULT_OG_IMAGE = 'https://greenconnect.cloud/og/default.png';

export function usePageSeo(opts: UsePageSeoOptions) {
  useEffect(() => {
    const {
      id, title, description, keywords, url,
      ogType        = 'website',
      ogTitle       = title,
      ogDescription = description,
      ogImage       = DEFAULT_OG_IMAGE,
      ogImageWidth  = 1200,
      ogImageHeight = 630,
      ogImageAlt    = title,
      robots,
      breadcrumb,
      articleJsonLd,
      faqJsonLd,
    } = opts;

    document.title = title;

    // ─── Helpers ──────────────────────────────────────────────────────────
    const setMeta = (name: string, content: string, isProperty = false) => {
      const sel = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let m = document.querySelector(sel) as HTMLMetaElement | null;
      if (!m) {
        m = document.createElement('meta');
        if (isProperty) m.setAttribute('property', name); else m.name = name;
        m.setAttribute('data-seo', id);
        document.head.appendChild(m);
      }
      m.setAttribute('content', content);
    };

    const setLink = (rel: string, href: string) => {
      let l = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!l) {
        l = document.createElement('link');
        l.rel = rel;
        l.setAttribute('data-seo', id);
        document.head.appendChild(l);
      }
      l.href = href;
    };

    const addJsonLd = (key: string, data: object) => {
      const elId = `jsonld-${id}-${key}`;
      document.getElementById(elId)?.remove();
      const s = document.createElement('script');
      s.id = elId;
      s.type = 'application/ld+json';
      s.text = JSON.stringify(data);
      s.setAttribute('data-seo', id);
      document.head.appendChild(s);
    };

    // ─── Standard meta ────────────────────────────────────────────────────
    setMeta('description', description);
    if (keywords) setMeta('keywords', keywords);
    if (robots) setMeta('robots', robots);

    setLink('canonical', url);

    // ─── Open Graph ───────────────────────────────────────────────────────
    setMeta('og:type',           ogType,                       true);
    setMeta('og:url',            url,                          true);
    setMeta('og:title',          ogTitle,                      true);
    setMeta('og:description',    ogDescription,                true);
    setMeta('og:site_name',      'ESG Flow',                   true);
    setMeta('og:locale',         'fr_FR',                      true);
    setMeta('og:image',          ogImage,                      true);
    setMeta('og:image:width',    String(ogImageWidth),         true);
    setMeta('og:image:height',   String(ogImageHeight),        true);
    setMeta('og:image:alt',      ogImageAlt,                   true);
    setMeta('og:image:type',     'image/png',                  true);

    // ─── Twitter Card ─────────────────────────────────────────────────────
    setMeta('twitter:card',        'summary_large_image');
    setMeta('twitter:title',       ogTitle);
    setMeta('twitter:description', ogDescription);
    setMeta('twitter:image',       ogImage);
    setMeta('twitter:image:alt',   ogImageAlt);

    // ─── BreadcrumbList JSON-LD ──────────────────────────────────────────
    if (breadcrumb && breadcrumb.length > 0) {
      addJsonLd('breadcrumb', {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumb.map((b, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "name": b.name,
          "item": b.url,
        })),
      });
    }

    if (articleJsonLd) addJsonLd('article', articleJsonLd);
    if (faqJsonLd)     addJsonLd('faq',     faqJsonLd);

    // ─── Cleanup on unmount: remove every node we tagged ──────────────────
    return () => {
      document.querySelectorAll(`[data-seo="${id}"]`).forEach(el => el.remove());
    };
  }, [opts.id]);  // eslint-disable-line react-hooks/exhaustive-deps
}
