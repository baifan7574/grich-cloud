import { defineConfig } from 'astro/config';

// 移除所有插件引用，防止依赖报错
export default defineConfig({
    output: 'static',
    // 确保没有 integrations: [tailwind()] 这一行！
    // 确保没有 adapter！
});
