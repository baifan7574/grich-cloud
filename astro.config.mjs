// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
    // 强制声明为静态站点，不需要服务器支持
    output: 'static',
    integrations: [tailwind()],
    // 禁用所有其他的适配器，防止报错
});
