import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Redirige les appels /api/epg vers le backend pour le développement local
      '/api/epg': {
        target: process.env.VITE_EPG_API_URL || 'http://localhost:10000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/epg/, '/guide.xml'),
      },
      // Conserve le proxy existant si nécessaire pour d'autres appels
      '/epg': {
        target: 'http://xmltv.xmltv.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/epg/, ''),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
