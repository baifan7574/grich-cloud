// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
    output: 'server',
    adapter: cloudflare({
        mode: 'directory',
        runtime: {
            mode: 'local',
            type: 'pages'
        }
    }),
    integrations: [react(), tailwind()],
    vite: {
        ssr: {
            external: ['node:stream', 'node:buffer', 'node:fs', 'node:path', 'node:crypto']
        }
    }
});
