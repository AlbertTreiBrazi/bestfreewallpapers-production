import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://bestfreewallpapers.com";

interface PageMeta {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
}

const PAGE_CONFIG: Record<string, PageMeta> = {
  "home": {
    title: "Best Free Wallpapers - HD Desktop & Mobile Backgrounds 2025",
    description: "Download the best free wallpapers in HD quality. 10,000+ desktop and mobile backgrounds including nature, abstract, gaming, AI art, and more. Updated daily with trending wallpapers.",
    keywords: "best free wallpapers, free wallpapers, wallpapers free download, high quality wallpapers, HD wallpapers, desktop wallpapers, mobile wallpapers, best free mobile wallpapers, best free AI wallpapers, wallpaper download, 4K wallpapers free, free desktop backgrounds",
    ogImage: `${BASE_URL}/images/og-default.jpg`
  },
  "ai-wallpapers": {
    title: "Free AI Art Wallpapers - Generated Backgrounds & Images",
    description: "Discover stunning AI-generated wallpapers. Unique, high-quality AI art backgrounds for desktop and mobile devices. Free download.",
    keywords: "AI wallpapers, AI art backgrounds, generated wallpapers, midjourney wallpapers, stable diffusion backgrounds, digital art, generative art, artificial intelligence art",
    ogImage: `${BASE_URL}/images/og-default.jpg`
  },
  "mobile-wallpapers": {
    title: "Best Free Mobile Wallpapers - 4K Phone Backgrounds (iOS & Android)",
    description: "Download the best free mobile wallpapers. Vertical backgrounds optimized for iPhone, Samsung, Pixel and other smartphones. 4K & HD quality.",
    keywords: "mobile wallpapers, phone backgrounds, iphone wallpapers, android wallpapers, vertical wallpapers, 4K mobile backgrounds, hd phone wallpapers, samsung wallpapers, pixel wallpapers",
    ogImage: `${BASE_URL}/images/og-default.jpg`
  },
  "collections": {
    title: "Wallpaper Collections - Curated Themes & Series",
    description: "Browse our curated wallpaper collections. Hand-picked themes including nature, space, cars, anime, minimalism and more.",
    keywords: "wallpaper collections, curated wallpapers, wallpaper themes, background series, best wallpaper packs, hd wallpaper collections",
    ogImage: `${BASE_URL}/images/og-default.jpg`
  },
  "categories": {
    title: "Wallpaper Categories - Browse by Topic",
    description: "Find the perfect wallpaper by category. Nature, Abstract, Gaming, Anime, Cars, Technology, and many more categories to choose from.",
    keywords: "wallpaper categories, background categories, wallpaper topics, browse wallpapers, wallpaper genres",
    ogImage: `${BASE_URL}/images/og-default.jpg`
  },
  "premium": {
    title: "Premium Wallpapers - Exclusive 4K & 8K Backgrounds",
    description: "Get access to exclusive premium wallpapers. Ultra high resolution 4K and 8K backgrounds with no compression. The highest quality available.",
    keywords: "premium wallpapers, 4K wallpapers, 8K wallpapers, exclusive backgrounds, high resolution wallpapers, uncompressed wallpapers, pro wallpapers",
    ogImage: `${BASE_URL}/images/og-default.jpg`
  },
  "free-wallpapers": {
    title: "Free Wallpapers - Top Rated High Quality Backgrounds",
    description: "The ultimate collection of free wallpapers. Top rated, most downloaded, and trending backgrounds for all devices.",
    keywords: "free wallpapers, top rated wallpapers, trending backgrounds, popular wallpapers, best wallpapers free",
    ogImage: `${BASE_URL}/images/og-default.jpg`
  }
};

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateHtml(page: string): string {
  // Normalize page param to lowercase and default to home if not found
  const normalizedPage = (page || "home").toLowerCase();
  const pageKey = PAGE_CONFIG[normalizedPage] ? normalizedPage : "home";
  const config = PAGE_CONFIG[pageKey];

  // Construct canonical URL
  // If pageKey is 'home', canonical is just domain root
  // Otherwise it is domain/pageKey (e.g. /ai-wallpapers)
  const canonicalPath = pageKey === "home" ? "" : `/${pageKey}`;
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": config.title,
    "description": config.description,
    "url": canonicalUrl,
    "publisher": {
      "@type": "Organization",
      "name": "BestFreeWallpapers",
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/images/logo.png`
      }
    }
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${escapeHtml(config.title)}</title>
  <meta name="description" content="${escapeHtml(config.description)}" />
  <meta name="keywords" content="${escapeHtml(config.keywords)}" />
  <meta name="author" content="BestFreeWallpapers Team" />
  <meta name="robots" content="index, follow, max-image-preview:large" />

  <meta name="theme-color" content="#374151" />

  <meta property="og:title" content="${escapeHtml(config.title)}" />
  <meta property="og:description" content="${escapeHtml(config.description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="BestFreeWallpapers" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${escapeHtml(config.ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(config.title)}" />
  <meta name="twitter:description" content="${escapeHtml(config.description)}" />
  <meta name="twitter:image" content="${escapeHtml(config.ogImage)}" />

  <link rel="canonical" href="${canonicalUrl}" />

  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.json" />

  <style>
    html{background-color:#111827;color:#f9fafb}
    body{margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif}
    #root{min-height:100vh}
  </style>

  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/seo-loader.js"></script>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const page = url.searchParams.get("page") || "home";

    return new Response(generateHtml(page), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "X-SEO-Source": "supabase-edge"
      },
    });
  } catch (error) {
    console.error("Function error:", error);
    // Fallback to home page on error
    return new Response(generateHtml("home"), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "X-SEO-Source": "supabase-edge-error"
      },
    });
  }
});
