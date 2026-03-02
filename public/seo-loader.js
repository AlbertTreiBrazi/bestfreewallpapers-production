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
