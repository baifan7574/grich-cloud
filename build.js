const fs = require('fs-extra');
const path = require('path');

async function build() {
  try {
    const distDir = path.join(__dirname, 'dist');
    await fs.ensureDir(distDir);

    // 仅复制 HTML 文件到 dist
    const htmlFiles = await fs.readdir(__dirname);
    for (const file of htmlFiles) {
      if (path.extname(file) === '.html') {
        await fs.copy(
          path.join(__dirname, file),
          path.join(distDir, file)
        );
        console.log(`✅ Copying: ${file}`);
      }
    }

    // 复制 sitemap.xml 如果在根目录存在
    if (fs.existsSync(path.join(__dirname, 'sitemap.xml'))) {
      await fs.copy(path.join(__dirname, 'sitemap.xml'), path.join(distDir, 'sitemap.xml'));
      console.log('✅ Copying: sitemap.xml');
    }

    // 新增: 确保 functions 文件夹也被同步到 dist (针对某些手动上传部署的情况)
    const functionsDir = path.join(__dirname, 'functions');
    if (fs.existsSync(functionsDir)) {
      await fs.copy(functionsDir, path.join(distDir, 'functions'));
      console.log('✅ Copying: functions/ (SSR Workers)');
    }

    console.log('🚀 Build Success - Files copied to dist');
  } catch (error) {
    console.error('❌ Build Failed:', error);
    process.exit(1);
  }
}

build();