const fs = require('fs-extra');
const path = require('path');

const htmlAllowlist = [
  'index.html',
  'cn.html',
  'intake.html',
  'pricing.html',
  'sample-report.html',
  'lawyer-partner.html',
  'case_template.html',
  'dashboard.html',
  'guide_tro_frozen.html',
  'payment_success.html',
  'privacy.html',
  'refund.html',
  'terms.html'
];

async function build() {
  try {
    const distDir = path.join(__dirname, 'dist');
    await fs.emptyDir(distDir);

    for (const file of htmlAllowlist) {
      const source = path.join(__dirname, file);
      if (await fs.pathExists(source)) {
        await fs.copy(source, path.join(distDir, file));
        console.log(`Copied: ${file}`);
      }
    }

    const publicFiles = ['robots.txt', 'sitemap.xml', 'sitemap_index.xml'];
    for (const file of publicFiles) {
      const source = path.join(__dirname, 'public', file);
      if (await fs.pathExists(source)) {
        await fs.copy(source, path.join(distDir, file));
        console.log(`Copied: ${file}`);
      }
    }

    const functionsDir = path.join(__dirname, 'functions');
    if (await fs.pathExists(functionsDir)) {
      await fs.copy(functionsDir, path.join(distDir, 'functions'));
      console.log('Copied: functions/');
    }

    await fs.copy(path.join(__dirname, 'analytics.js'), path.join(distDir, 'analytics.js'));
    console.log('Copied: analytics.js');

    for (const dir of ['guides', 'law-firms', 'cases']) {
      const source = path.join(__dirname, dir);
      if (await fs.pathExists(source)) {
        await fs.copy(source, path.join(distDir, dir));
        console.log(`Copied: ${dir}/`);
      }
    }

    console.log('Build complete: clean files copied to dist');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
