const { defineConfig } = require('drizzle-kit');
const { resolve } = require('path');
const { fileURLToPath } = require('url');

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

module.exports = defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: resolve(__dirname, 'farmaguardia.db'),
  },
  verbose: true,
  strict: true,
});