import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // Note: lovable-tagger removed for production compatibility
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Increase chunk size warning limit to handle large dependencies
    chunkSizeWarningLimit: 2000,
    // Configure manual chunks to optimize bundle size
    rollupOptions: {
      external: [
        // Exclude server-side only modules from client build
        'dotenv',
        'fs',
        'path',
        'os',
      ],
      output: {
        // Split large dependencies into separate chunks for better caching
        manualChunks: {
          // Hedera SDK - largest dependency
          'hedera-sdk': ['@hashgraph/sdk'],
          // Wallet connection libraries
          'wallet-libs': ['hashconnect'],
          // UI libraries
          'ui-libs': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-slot'
          ],
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Utility libraries
          'utils': ['axios', 'date-fns', 'clsx', 'tailwind-merge', 'class-variance-authority'],
          // Other large dependencies
          'other-libs': ['@tanstack/react-query', '@supabase/supabase-js', 'lucide-react']
        },
      },
    },
    // Enable source maps for better debugging in production
    sourcemap: false,
    // Optimize for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  // Ensure only VITE_ prefixed environment variables are included
  envPrefix: 'VITE_',
}));
