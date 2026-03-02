import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://bestfreewallpapers.com";

function formatDate(date: string | null): string {
  if (!date) return new Date().toISOString().split("T")[0];
  return new Date(date).toISOString().split("T")[0];
}

function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all published wallpapers
    const { data: wallpapers, error: wpError } = await supabase
      .from("wallpapers")
      .select("slug, updated_at")
      .eq("is_published", true)
      .order("updated_at", { ascending: false })
      .limit(50000);

    if (wpError) {
      console.error("Wallpapers error:", wpError.message);
    }

    // Fetch all active categories
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("slug, updated_at")
      .eq("is_active", true);

    if (catError) {
      console.error("Categories error:", catError.message);
    }

    // Fetch all published collections
    const { data: collections, error: colError } = await supabase
      .from("collections")
      .select("slug, updated_at")
      .eq("is_published", true);

    if (colError) {
      console.error("Collections error:", colError.message);
    }

    // Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/free-wallpapers</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/categories</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/collections</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/ai-wallpapers</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/mobile-wallpapers</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;

    // Add wallpaper pages
    if (wallpapers && wallpapers.length > 0) {
      for (const wp of wallpapers) {
        xml += `  <url>
    <loc>${BASE_URL}/wallpaper/${escapeXml(wp.slug)}</loc>
    <lastmod>${formatDate(wp.updated_at)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    // Add category pages
    if (categories && categories.length > 0) {
      for (const cat of categories) {
        xml += `  <url>
    <loc>${BASE_URL}/category/${escapeXml(cat.slug)}</loc>
    <lastmod>${formatDate(cat.updated_at)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    // Add collection pages
    if (collections && collections.length > 0) {
      for (const col of collections) {
        xml += `  <url>
    <loc>${BASE_URL}/collection/${escapeXml(col.slug)}</loc>
    <lastmod>${formatDate(col.updated_at)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Sitemap error:", error);

    // Return minimal valid sitemap on error
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(fallbackXml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  }
});
