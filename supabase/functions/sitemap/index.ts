import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://bestfreewallpapers.com";

function formatDate(date: string | null): string {
  if (!date) return new Date().toISOString().split("T")[0];  // Fallback to today (2026-03-07)
  const formatted = new Date(date).toISOString().split("T")[0];
  return formatted > new Date().toISOString().split("T")[0] ? formatted : new Date().toISOString().split("T")[0];  // Force today if old
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
    } else {
      console.log(`Fetched ${wallpapers?.length || 0} wallpapers`);  // Debug: See in logs
    }

    // Fetch all active categories
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("slug, updated_at")
      .eq("is_active", true);

    if (catError) {
      console.error("Categories error:", catError.message);
    } else {
      console.log(`Fetched ${categories?.length || 0} categories`);
    }

    // Fetch all published collections
    const { data: collections, error: colError } = await supabase
      .from("collections")
      .select("slug, updated_at")
      .eq("is_published", true);

    if (colError) {
      console.error("Collections error:", colError.message);
    } else {
      console.log(`Fetched ${collections?.length || 0} collections`);
    }

    // Generate XML
    const today = new Date().toISOString().split("T")[0];  // Force today everywhere
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages with today lastmod -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/free-wallpapers</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/categories</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/collections</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/ai-wallpapers</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/mobile-wallpapers</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/premium</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${BASE_URL}/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${BASE_URL}/contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;

    // Add wallpaper pages
    if (wallpapers && wallpapers.length > 0) {
      for (const wp of wallpapers) {
        const slug = wp.slug || `id-${Date.now()}`;  // Fallback if slug null
        const lastmod = formatDate(wp.updated_at);
        xml += `  <url>
    <loc>${BASE_URL}/wallpaper/${escapeXml(slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    // Add category pages (fixed to plural route)
    if (categories && categories.length > 0) {
      for (const cat of categories) {
        const slug = cat.slug || `id-${Date.now()}`;
        const lastmod = formatDate(cat.updated_at);
        xml += `  <url>
    <loc>${BASE_URL}/categories/${escapeXml(slug)}</loc>  <!-- Fixed: plural /categories/ -->
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    // Add collection pages (fixed to plural route)
    if (collections && collections.length > 0) {
      for (const col of collections) {
        const slug = col.slug || `id-${Date.now()}`;
        const lastmod = formatDate(col.updated_at);
        xml += `  <url>
    <loc>${BASE_URL}/collections/${escapeXml(slug)}</loc>  <!-- Fixed: plural /collections/ -->
    <lastmod>${lastmod}</lastmod>
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
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",  // FIX: Shorter cache for quick updates
      },
    });
  } catch (error) {
    console.error("Sitemap error:", error);

    // Return minimal valid sitemap on error
    const today = new Date().toISOString().split("T")[0];
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
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