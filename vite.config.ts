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
    chunkSizeWarningLimit: 1000,
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
        manualChunks: {
          // Separate vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'hedera-vendor': ['@hashgraph/sdk'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-slot'],
          'wallet-vendor': ['@hashconnect/sdk'],
        },
      },
    },
  },
  // Ensure only VITE_ prefixed environment variables are included
  envPrefix: 'VITE_',
}));
