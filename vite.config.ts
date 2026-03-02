import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    }), 
    // Gzip compression
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // Only compress files larger than 10KB
      algorithm: 'gzip',
      ext: '.gz',
      deleteOriginFile: false
    }),
    // Brotli compression (better than gzip but requires server support)
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
      deleteOriginFile: false
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext',
    sourcemap: false, // Disable sourcemaps for production (smaller bundle)
    minify: 'terser', // Enable minification for security and performance
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
        passes: 2 // Multiple passes for better compression
      },
      mangle: {
        safari10: true // Safari 10 compatibility
      },
      format: {
        comments: false // Remove all comments
      }
    },
    rollupOptions: {
      output: {
        // Only manually chunk vendor libraries - let app components be naturally split
        manualChunks: (id) => {
          // Only handle vendor libraries, not app components
          if (id.includes('node_modules')) {
            // Core vendor chunks
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('react-router') || id.includes('react-router-dom')) {
              return 'vendor-router'
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query'
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'vendor-supabase'
            }
            // UI library chunks
            if (id.includes('@radix-ui')) {
              return 'vendor-radix'
            }
            // Icons and utilities
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
              return 'vendor-utils'
            }
          }
          // Don't manually chunk app components - let Vite handle lazy loading naturally
          return null
        },
        // Better file naming for cache busting
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || ''
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico|webp)$/i.test(name)) {
            return 'assets/images/[name]-[hash][extname]'
          } else if (/\.(woff2?|eot|ttf|otf)$/i.test(name)) {
            return 'assets/fonts/[name]-[hash][extname]'
          } else if (/\.css$/i.test(name)) {
            return 'assets/css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting for better caching
    cssCodeSplit: true,
    // Inline small CSS files for better LCP
    cssMinify: true,
    // Disable asset inlining to prevent module loading issues
    assetsInlineLimit: 0, // Disable inlining completely
    // Report compressed size
    reportCompressedSize: true,
    // Additional optimizations for bundle size reduction
    assetsDir: 'assets'
  },
  server: {
    port: 3000,
    host: true,
    headers: {
      // Development security headers - matches production configuration
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.supabase.net https://*.minimax.io",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "media-src 'self' https: data: blob:",
        "connect-src 'self' https://*.supabase.co https://*.supabase.net https://*.minimax.io wss://*.supabase.co wss://*.supabase.net",
        "frame-src 'self' https:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'"
      ].join('; '),
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // Add proper MIME types for static assets
      'Cache-Control': 'public, max-age=31536000'
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js'
    ],
    // Exclude heavy dependencies that don't need pre-bundling
    exclude: []
  }
})