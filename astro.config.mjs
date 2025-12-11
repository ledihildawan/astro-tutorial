import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';

import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'http://localhost:4321',
  integrations: [preact()],
  adapter: netlify(),
});