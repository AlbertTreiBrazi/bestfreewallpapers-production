type RenderOpts = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
  format?: 'webp' | 'avif' | 'origin';
};

export function toSupabaseRenderImageUrl(inputUrl: string, opts: RenderOpts = {}) {
  if (!inputUrl) return inputUrl;

  // Already optimized
  if (inputUrl.includes('/storage/v1/render/image/')) return inputUrl;

  const marker = '/storage/v1/object/public/';
  const idx = inputUrl.indexOf(marker);
  if (idx === -1) return inputUrl;

  const base = inputUrl.slice(0, idx);
  const path = inputUrl.slice(idx + marker.length); // bucket/path...

  const u = new URL(`${base}/storage/v1/render/image/public/${path}`);

  u.searchParams.set('quality', String(opts.quality ?? 70));
  u.searchParams.set('format', opts.format ?? 'webp');

  if (opts.width) u.searchParams.set('width', String(opts.width));
  if (opts.height) u.searchParams.set('height', String(opts.height));
  if (opts.resize) u.searchParams.set('resize', opts.resize);

  return u.toString();
}