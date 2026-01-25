const fs = require('fs-extra');
const path = require('path');

async function build() {
  try {
    // 创建dist目录
    const distDir = path.join(__dirname, 'dist');
    await fs.ensureDir(distDir);

    // 复制HTML文件
    const htmlFiles = await fs.readdir(__dirname);
    for (const file of htmlFiles) {
      if (path.extname(file) === '.html') {
        await fs.copy(
          path.join(__dirname, file),
          path.join(distDir, file)
        );
        console.log(`✅ 复制HTML: ${file}`);
      }
    }

    // ⚠️ 重要：functions/ 必须保留在根目录，与dist/平级
    // Cloudflare Pages会自动识别根目录的functions/
    console.log('📁 functions/ 保留在根目录（与dist/平级）');

    console.log('🚀 构建完成 - pSEO结构就绪');
  } catch (error) {
    console.error('❌ 构建失败:', error);
    process.exit(1);
  }
}

build();