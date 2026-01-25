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
        console.log(`✅ 复制成功: ${file}`);
      }
    }
    
    // 复制functions目录
    const functionsDir = path.join(__dirname, 'functions');
    if (await fs.pathExists(functionsDir)) {
      await fs.copy(
        functionsDir,
        path.join(distDir, 'functions')
      );
      console.log('✅ 复制成功: functions目录');
    }
    
    console.log('🚀 构建完成');
  } catch (error) {
    console.error('❌ 构建失败:', error);
    process.exit(1);
  }
}

build();