const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://jaxfamlaw.com/';
const SITEMAP_URL = 'https://jaxfamlaw.com/sitemap.xml';

async function loadGoogleApis() {
  try {
    return require('googleapis').google;
  } catch {
    return null;
  }
}

function readAuthConfig() {
  const envCredentials = process.env.GOOGLE_JSON_KEY;
  const envKeyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const localFiles = [
    path.join(__dirname, 'google-service-account.json'),
    path.join(__dirname, '../google_key.json')
  ];

  if (envCredentials) {
    return {
      credentials: JSON.parse(envCredentials),
      scopes: [
        'https://www.googleapis.com/auth/webmasters',
        'https://www.googleapis.com/auth/webmasters.readonly'
      ]
    };
  }

  if (envKeyFile && fs.existsSync(envKeyFile)) {
    return {
      keyFile: envKeyFile,
      scopes: [
        'https://www.googleapis.com/auth/webmasters',
        'https://www.googleapis.com/auth/webmasters.readonly'
      ]
    };
  }

  for (const keyFile of localFiles) {
    if (fs.existsSync(keyFile)) {
      return {
        keyFile,
        scopes: [
          'https://www.googleapis.com/auth/webmasters',
          'https://www.googleapis.com/auth/webmasters.readonly'
        ]
      };
    }
  }

  return null;
}

async function submitSitemap() {
  const sitemapFile = path.join(__dirname, '../public/sitemap.xml');
  if (!fs.existsSync(sitemapFile)) {
    throw new Error('Missing public/sitemap.xml. Run npm run sitemap first.');
  }

  const sitemapContent = fs.readFileSync(sitemapFile, 'utf8');
  const urlCount = (sitemapContent.match(/<loc>/g) || []).length;
  if (urlCount < 10) {
    throw new Error(`Sitemap has only ${urlCount} URLs. Aborting to avoid submitting a broken sitemap.`);
  }

  const google = await loadGoogleApis();
  const authConfig = readAuthConfig();

  if (!google) {
    console.log('googleapis is not installed. Install it only if you want automatic Search Console submission.');
    console.log(`Manual action: open Google Search Console and submit ${SITEMAP_URL}`);
    return;
  }

  if (!authConfig) {
    console.log('No Google service account key found.');
    console.log('Set GOOGLE_JSON_KEY or place google_key.json locally, then add that service account as an owner in Search Console.');
    console.log(`Manual action: submit ${SITEMAP_URL} in Google Search Console.`);
    return;
  }

  const auth = new google.auth.GoogleAuth(authConfig);
  const searchconsole = google.searchconsole({ version: 'v1', auth });
  await searchconsole.sitemaps.submit({
    siteUrl: SITE_URL,
    feedpath: SITEMAP_URL
  });

  console.log(`Submitted sitemap to Google Search Console: ${SITEMAP_URL}`);
}

submitSitemap().catch(error => {
  console.error(error.message);
  process.exit(1);
});
