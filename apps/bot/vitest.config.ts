import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@tests': fileURLToPath(new URL('./tests', import.meta.url))
    }
  },
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DISCORD_TOKEN: 'test-token',
      DISCORD_CLIENT_ID: '100000000000000001',
      DISCORD_GUILD_ID: '200000000000000002'
    }
  }
});
