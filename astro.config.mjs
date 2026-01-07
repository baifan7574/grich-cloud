import { defineConfig } from 'astro/config';

// 强制声明为纯静态模式 (Static Generation)
// 这样 Cloudflare 就不会去找 Adapter 了，直接生成 HTML
export default defineConfig({
    output: 'static',
});
