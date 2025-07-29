import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Conditionally import lovable-tagger only in development
const getDevPlugins = async (mode: string) => {
  if (mode === 'development') {
    try {
      const { componentTagger } = await import("lovable-tagger");
      return [componentTagger()];
    } catch (error) {
      console.warn('lovable-tagger not available, skipping...');
      return [];
    }
  }
  return [];
};

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    ...(await getDevPlugins(mode)),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
