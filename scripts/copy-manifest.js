/**
 * copy-manifest.js
 *
 * Copies dist/manifest.json to api/_manifest.json so it can be bundled
 * with Vercel serverless functions at deployment time.
 *
 * This runs after `vite build` to ensure the manifest is available
 * at runtime in the serverless environment.
 */

import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const srcManifest = join(rootDir, 'dist', 'manifest.json');
const destManifest = join(rootDir, 'api', '_manifest.json');

try {
  // Check if source manifest exists
  if (!existsSync(srcManifest)) {
    console.warn('[copy-manifest] WARNING: dist/manifest.json not found - SEO routes will use fallback paths');
    console.warn('[copy-manifest] Run `npm run build` first to generate the manifest');
    process.exit(0); // Don't fail the build
  }

  // Ensure api directory exists
  const apiDir = join(rootDir, 'api');
  if (!existsSync(apiDir)) {
    mkdirSync(apiDir, { recursive: true });
  }

  // Copy manifest to api folder
  copyFileSync(srcManifest, destManifest);
  console.log('[copy-manifest] SUCCESS: Copied manifest.json to api/_manifest.json');

} catch (error) {
  console.error('[copy-manifest] ERROR:', error.message);
  console.warn('[copy-manifest] SEO routes will use fallback paths');
  // Don't fail the build - fallbacks will be used
}
