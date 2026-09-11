import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  plugins: [react({jsxImportSource:'@studio/typography'}), cloudflare()],
  resolve:{alias:{'@studio/typography':fileURLToPath(new URL('./src/typography',import.meta.url))}},
  server: { port: 5173 },
  build: {
    rolldownOptions: {
      output: { manualChunks: (id) => id.includes('/echarts/') || id.includes('zrender') ? 'charts' : undefined }
    }
  }
});
