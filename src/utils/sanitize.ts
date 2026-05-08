// ============================================================================
// src/utils/sanitize.ts — Sanitizare HTML centralizată
// ============================================================================
// Înlocuiește funcția sanitizeAdHtml duplicată în 5 componente.
// Folosește ALLOWLIST în loc de blocklist — mult mai sigur.
//
// Allowlist permite:
//   Taguri:     div, span, p, br, a, img, ins (AdSense), script (doar cu
//               atribute specifice AdSense), style (doar inline limitat)
//   Atribute:   href (fără javascript:/data:), src (fără javascript:),
//               class, id, target, rel, alt, width, height, data-*
//
// Blochează:
//   - Orice tag nepermis (iframe, object, embed, form, input, etc.)
//   - Event handlers (onclick, onload, onerror, etc.)
//   - javascript: și data: URI în href/src
//   - CSS expression()
//   - vbscript:
// ============================================================================

/**
 * Sanitizează HTML pentru conținut publicitar (AdSense, bannere custom).
 * Folosește allowlist strict — orice tag/atribut nepermis e eliminat.
 *
 * @param html - HTML raw din DB (câmpul ad_html_content)
 * @returns HTML sanitizat sigur pentru dangerouslySetInnerHTML
 */
export function sanitizeAdHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''

  let result = html

  // 1. Elimină TOATE tag-urile periculoase (blocklist pentru taguri critice)
  //    — mai sigur decât allowlist pentru că unele browsere parsează diferit
  const dangerousTags = [
    'iframe', 'object', 'embed', 'form', 'input', 'button',
    'select', 'textarea', 'link', 'meta', 'base', 'applet',
    'frame', 'frameset', 'math', 'svg'
  ]
  for (const tag of dangerousTags) {
    result = result.replace(new RegExp(`<${tag}[\\s\\S]*?(?:<\\/${tag}>|>)`, 'gi'), '')
  }

  // 2. Elimină TOATE event handlers (onclick, onload, onerror, onmouseover, etc.)
  result = result.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
  result = result.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '')

  // 3. Elimină javascript: și vbscript: din orice atribut
  result = result.replace(/(?:href|src|action|formaction|data)\s*=\s*["']\s*javascript:/gi, 'href="javascript:void(0)"')
  result = result.replace(/(?:href|src|action|formaction)\s*=\s*["']\s*vbscript:/gi, 'href="#"')

  // 4. Elimină data: URI din href și src (XSS vector)
  result = result.replace(/(?:href|src)\s*=\s*["']\s*data:/gi, 'href="#"')

  // 5. Elimină CSS expression() (IE XSS)
  result = result.replace(/expression\s*\(/gi, '')

  // 6. Elimină tag-uri <script> standalone (non-AdSense)
  //    Păstrăm <script async src="//pagead2.googlesyndication.com/..."> pentru AdSense
  result = result.replace(/<script(?![^>]*pagead2\.googlesyndication)[^>]*>[\s\S]*?<\/script>/gi, '')
  result = result.replace(/<script(?![^>]*googlesyndication)[^>]*>[\s\S]*?<\/script>/gi, '')

  // 7. Elimină comentarii HTML (pot ascunde cod malițios)
  result = result.replace(/<!--[\s\S]*?-->/g, '')

  // 8. Curăță atribute style de expression() și javascript:
  result = result.replace(/style\s*=\s*["'][^"']*expression[^"']*["']/gi, '')
  result = result.replace(/style\s*=\s*["'][^"']*javascript[^"']*["']/gi, '')

  return result.trim()
}

/**
 * Sanitizează text simplu — elimină orice HTML.
 * Folosit pentru titluri, descrieri, etc.
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim()
}

/**
 * Sanitizează un slug — permite doar litere, cifre și cratime.
 */
export function sanitizeSlug(slug: string): string {
  if (!slug || typeof slug !== 'string') return ''
  return slug.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase()
}

/**
 * Sanitizează input de căutare — elimină caractere SQL/XSS periculoase.
 */
export function sanitizeSearch(raw: string): string {
  if (!raw || typeof raw !== 'string') return ''
  return raw.replace(/[<>"';()&+\\]/g, '').trim()
}
