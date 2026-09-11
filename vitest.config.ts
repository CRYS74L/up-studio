import { defineConfig } from 'vitest/config';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  resolve:{alias:{'@studio/typography':fileURLToPath(new URL('./src/typography',import.meta.url))}},
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'worker/**/*.test.ts']
  }
});
