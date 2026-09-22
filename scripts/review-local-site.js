const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(repoRoot, 'src');
const publicDir = path.join(repoRoot, 'public');
const siteDir = fs.existsSync(publicDir) ? publicDir : sourceDir;

const requiredFiles = [
  'index.html',
  'privacy-policy.html',
  'terms-of-use.html',
  'educational-disclaimer.html',
  'offline.html',
  'manifest.webmanifest',
  'robots.txt',
  'sitemap.xml',
  'service-worker.js',
  'assets/styles.css',
  'assets/app.js',
  'assets/well-control-logo.png',
  'assets/social-card.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
];

const htmlFiles = [
  'index.html',
  'privacy-policy.html',
  'terms-of-use.html',
  'educational-disclaimer.html',
  'offline.html',
];

const failures = [];

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(siteDir, relativePath), 'utf8');
}

function isLocalReference(value) {
  return (
    value &&
    !value.startsWith('#') &&
    !/^(?:[a-z]+:|\/\/)/i.test(value) &&
    !value.startsWith('mailto:')
  );
}

function normalizeReference(value) {
  return value.split(/[?#]/, 1)[0].replace(/^\.\//, '');
}

for (const relativePath of requiredFiles) {
  assert(fs.existsSync(path.join(siteDir, relativePath)), `Missing ${relativePath}`);
}

for (const relativePath of htmlFiles) {
  const html = read(relativePath);
  assert(html.includes('loadGoogleAnalytics'), `${relativePath} must use the guarded Google Analytics loader`);
  assert(!html.includes('<script async src="https://www.googletagmanager.com/gtag/js?id='), `${relativePath} must not load GA unconditionally`);

  const referencePattern =
    /\b(?:href|src)=["']([^"']+)["']/gi;
  let match;
  while ((match = referencePattern.exec(html))) {
    if (!isLocalReference(match[1])) {
      continue;
    }

    const referencedPath = normalizeReference(match[1]);
    if (!referencedPath || referencedPath === relativePath) {
      continue;
    }

    assert(
      fs.existsSync(path.join(siteDir, referencedPath)),
      `${relativePath} references missing local asset ${match[1]}`,
    );
  }
}

const appJs = read('assets/app.js');
assert(appJs.includes('isLocalHost'), 'assets/app.js must detect local hosts');
assert(appJs.includes('unregister'), 'assets/app.js must unregister local service workers');
assert(appJs.includes('caches.delete'), 'assets/app.js must clear local Well Control caches');
assert(appJs.includes('serviceWorker.register'), 'assets/app.js must register the service worker outside local development');

const serviceWorker = read('service-worker.js');
assert(serviceWorker.includes('well-control-site-v10'), 'service-worker.js cache version must be v10');
assert(serviceWorker.includes('offline.html'), 'service-worker.js must keep offline fallback coverage');

const manifest = JSON.parse(read('manifest.webmanifest'));
assert(manifest.name === 'Well Control', 'manifest.webmanifest name must stay Well Control');
assert(manifest.icons?.length >= 2, 'manifest.webmanifest must keep app icons');

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Reviewed ${siteDir}`);
