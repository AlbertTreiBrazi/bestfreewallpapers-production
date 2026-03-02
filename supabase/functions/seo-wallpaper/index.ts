import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://bestfreewallpapers.com";

interface Wallpaper {
  id: number;
  title: string;
  description: string | null;
  slug: string;
  image_url: string;
  thumbnail_url: string | null;
  width: number;
  height: number;
  device_type: string | null;
  tags: string[] | null;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateHtml(wallpaper: Wallpaper | null, slug: string): string {
  // Fallback values if wallpaper not found
  const title = wallpaper
    ? escapeHtml(`${wallpaper.title} - Free HD Wallpaper Download | BestFreeWallpapers`)
    : escapeHtml(`${slug.replace(/-/g, " ")} - Free Wallpaper | BestFreeWallpapers`);

  const description = wallpaper?.description
    ? escapeHtml(wallpaper.description)
    : escapeHtml(`Download ${slug.replace(/-/g, " ")} wallpaper in high quality. Free HD wallpaper for desktop and mobile.`);

  const canonicalUrl = `${BASE_URL}/wallpaper/${slug}`;
  const imageUrl = wallpaper?.thumbnail_url || wallpaper?.image_url || `${BASE_URL}/images/og-default.jpg`;
  const imageWidth = wallpaper?.width || 1920;
  const imageHeight = wallpaper?.height || 1080;

  const keywords = wallpaper
    ? [wallpaper.title, ...(wallpaper.tags || []), "free wallpaper", "HD wallpaper", "download"].filter(Boolean).join(", ")
    : `${slug.replace(/-/g, " ")}, free wallpaper, HD wallpaper, download`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: wallpaper?.title || slug.replace(/-/g, " "),
    description: wallpaper?.description || `Free HD wallpaper: ${slug.replace(/-/g, " ")}`,
    contentUrl: wallpaper?.image_url || `${BASE_URL}/images/og-default.jpg`,
    thumbnailUrl: imageUrl,
    width: imageWidth,
    height: imageHeight,
    author: { "@type": "Organization", name: "BestFreeWallpapers" },
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="keywords" content="${escapeHtml(keywords)}" />
  <meta name="author" content="BestFreeWallpapers Team" />
  <meta name="robots" content="index, follow, max-image-preview:large" />

  <meta name="theme-color" content="#374151" />

  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="BestFreeWallpapers" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:width" content="${imageWidth}" />
  <meta property="og:image:height" content="${imageHeight}" />
  <meta property="og:image:alt" content="${escapeHtml(wallpaper?.title || slug.replace(/-/g, " "))}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />

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
  <script type="module">
    (async function() {
      try {
        const res = await fetch('/?_seo=1');
        const html = await res.text();
        const scriptMatch = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/);
        if (scriptMatch && scriptMatch[1]) {
          const script = document.createElement('script');
          script.type = 'module';
          script.src = scriptMatch[1];
          document.body.appendChild(script);
        }
        const styleMatches = html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g);
        for (const match of styleMatches) {
          if (match[1]) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = match[1];
            document.head.appendChild(link);
          }
        }
      } catch (e) { console.error('Loader error:', e); }
    })();
  </script>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return new Response(generateHtml(null, "wallpaper"), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: wallpaper, error } = await supabase
      .from("wallpapers")
      .select("id, title, description, slug, image_url, thumbnail_url, width, height, device_type, tags")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (error) {
      console.error("DB error:", error.message);
    }

    return new Response(generateHtml(wallpaper, slug), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Function error:", error);
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug") || "wallpaper";
    return new Response(generateHtml(null, slug), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
