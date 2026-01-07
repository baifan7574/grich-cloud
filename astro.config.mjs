import { defineConfig } from 'astro/config';

// 只有这一行配置。没有任何插件。没有任何适配器。
// 删除了其他文件后，这行代码将拥有“绝对统治权”。
export default defineConfig({
    output: 'static'
});
