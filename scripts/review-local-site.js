const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(repoRoot, 'src');
const publicDir = path.join(repoRoot, 'public');
const siteDir = publicDir;

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
  '_headers',
  '.htaccess',
];

const htmlFiles = [
  'index.html',
  'privacy-policy.html',
  'terms-of-use.html',
  'educational-disclaimer.html',
  'offline.html',
];
const canonicalUrls = new Map([
  ['index.html', 'https://well-control.eaxmarketplace.com'],
  ['privacy-policy.html', 'https://well-control.eaxmarketplace.com/privacy-policy.html'],
  ['terms-of-use.html', 'https://well-control.eaxmarketplace.com/terms-of-use.html'],
  [
    'educational-disclaimer.html',
    'https://well-control.eaxmarketplace.com/educational-disclaimer.html',
  ],
]);

const failures = [];
const stableAssetPattern =
  /(?:https:\/\/well-control\.eaxmarketplace\.com\/)?assets\/(?!build\/)(?:app\.js|styles\.css|well-control-logo\.(?:png|webp)|social-card\.png|icon-192\.png|icon-512\.png|favicon-32\.png|apple-touch-icon\.png)/;
const hashedAssetPattern =
  /^assets\/build\/[^/]+\.[a-f0-9]{8,}\.(?:css|js|png|jpe?g|webp|woff2?|ico|svg)$/i;
const androidDownloadMetadataPath = path.join(
  sourceDir,
  'data',
  'android-production-download.json',
);
const androidDownloadUrlPattern =
  /^https:\/\/zealot\.peakwalk\.tech\/download\/releases\/\d+$/;

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(siteDir, relativePath), 'utf8');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function htmlAttribute(attributes, name) {
  const match = attributes.match(
    new RegExp(`\\b${name}=(?:"([^"]+)"|'([^']+)'|([^\\s>]+))`, 'i'),
  );
  return match?.[1] || match?.[2] || match?.[3] || '';
}

function walk(dir, predicate, matches = []) {
  if (!fs.existsSync(dir)) {
    return matches;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, predicate, matches);
      continue;
    }
    if (!predicate || predicate(fullPath)) {
      matches.push(fullPath);
    }
  }
  return matches;
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

function fileSize(relativePath) {
  return fs.statSync(path.join(siteDir, relativePath)).size;
}

function minAssetSize(assets) {
  return Math.min(...assets.map(fileSize));
}

for (const relativePath of requiredFiles) {
  assert(fs.existsSync(path.join(siteDir, relativePath)), `Missing ${relativePath}`);
}

const hashedAssets = walk(path.join(siteDir, 'assets/build'), (candidate) =>
  fs.statSync(candidate).isFile(),
).map((filePath) => path.relative(siteDir, filePath).split(path.sep).join('/'));

assert(
  fs.existsSync(androidDownloadMetadataPath),
  'Missing Android production download metadata source',
);
const androidDownload = fs.existsSync(androidDownloadMetadataPath)
  ? readJson(androidDownloadMetadataPath)
  : {};
assert(
  androidDownloadUrlPattern.test(androidDownload.url),
  'Android production download URL must be a Zealot direct release download URL',
);
assert(
  typeof androidDownload.version === 'string' && androidDownload.version.length > 0,
  'Android production download metadata must include version',
);
assert(
  typeof androidDownload.build === 'string' && androidDownload.build.length > 0,
  'Android production download metadata must include build',
);
assert(
  typeof androidDownload.updatedAt === 'string' && androidDownload.updatedAt.length > 0,
  'Android production download metadata must include updatedAt',
);

assert(hashedAssets.some((asset) => /\.css$/i.test(asset)), 'Missing hashed CSS asset');
assert(hashedAssets.some((asset) => /\.js$/i.test(asset)), 'Missing hashed JavaScript asset');
assert(hashedAssets.some((asset) => /social-card\.[a-f0-9]{8,}\.png$/i.test(asset)), 'Missing hashed social-card image asset');
const hashedLogoPngAssets = hashedAssets.filter((asset) =>
  /well-control-logo\.[a-f0-9]{8,}\.png$/i.test(asset),
);
const hashedLogoWebpAssets = hashedAssets.filter((asset) =>
  /well-control-logo\.[a-f0-9]{8,}\.webp$/i.test(asset),
);
assert(hashedLogoPngAssets.length > 0, 'Missing hashed logo PNG fallback image asset');
assert(hashedLogoWebpAssets.length > 0, 'Missing hashed logo WebP image asset');
if (hashedLogoPngAssets.length > 0 && hashedLogoWebpAssets.length > 0) {
  assert(
    minAssetSize(hashedLogoWebpAssets) < minAssetSize(hashedLogoPngAssets),
    'Hashed logo WebP asset must be smaller than the PNG fallback',
  );
}

for (const asset of hashedAssets) {
  assert(hashedAssetPattern.test(asset), `Build asset is not content-hashed: ${asset}`);
}

for (const relativePath of htmlFiles) {
  const html = read(relativePath);
  assert(html.includes('localhost'), `${relativePath} must keep the local Google Analytics guard`);
  assert(html.includes('document.createElement("script")') || html.includes("document.createElement('script')"), `${relativePath} must load Google Analytics dynamically after the local guard`);
  assert(!html.includes('<script async src="https://www.googletagmanager.com/gtag/js?id='), `${relativePath} must not load GA unconditionally`);

  if (canonicalUrls.has(relativePath)) {
    const canonicalPattern = new RegExp(
      `<link\\s+rel=canonical\\s+href=["']?${canonicalUrls
        .get(relativePath)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?(?:\\s|>)`,
      'i',
    );
    assert(canonicalPattern.test(html), `${relativePath} must keep its canonical URL`);
  }

  const referencePattern =
    /\b(?:href|src)=("([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  let match;
  while ((match = referencePattern.exec(html))) {
    const value = match[2] || match[3] || match[4];
    if (!isLocalReference(value)) {
      continue;
    }

    const referencedPath = normalizeReference(value);
    if (!referencedPath || referencedPath === relativePath) {
      continue;
    }

    assert(
      fs.existsSync(path.join(siteDir, referencedPath)),
      `${relativePath} references missing local asset ${value}`,
    );
  }

  const srcsetPattern = /\bsrcset=("([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  while ((match = srcsetPattern.exec(html))) {
    const value = match[2] || match[3] || match[4];
    const candidates = value
      .split(',')
      .map((candidate) => candidate.trim().split(/\s+/, 1)[0])
      .filter(Boolean);
    for (const candidate of candidates) {
      if (!isLocalReference(candidate)) {
        continue;
      }

      const referencedPath = normalizeReference(candidate);
      assert(
        fs.existsSync(path.join(siteDir, referencedPath)),
        `${relativePath} references missing local srcset asset ${candidate}`,
      );
    }
  }

  const productionAssetPattern =
    /https:\/\/well-control\.eaxmarketplace\.com\/(assets\/build\/[^"'<>\s]+)/g;
  while ((match = productionAssetPattern.exec(html))) {
    assert(
      fs.existsSync(path.join(siteDir, normalizeReference(match[1]))),
      `${relativePath} references missing production asset ${match[1]}`,
    );
  }
}

const textFiles = walk(siteDir, (candidate) =>
  /\.(?:html|css|js|json|webmanifest|xml|txt)$/.test(candidate),
);
for (const filePath of textFiles) {
  const relativePath = path.relative(siteDir, filePath).split(path.sep).join('/');
  const content = fs.readFileSync(filePath, 'utf8');
  assert(!stableAssetPattern.test(content), `${relativePath} keeps a stable long-cache asset reference`);
}

const appJsPath = hashedAssets.find((asset) => {
  if (!/\.js$/i.test(asset)) {
    return false;
  }
  const content = read(asset);
  return content.includes('service-worker.js') && content.includes('serviceWorker');
});
assert(Boolean(appJsPath), 'Hashed app JavaScript must include service-worker registration logic');

if (appJsPath) {
  const appJs = read(appJsPath);
  assert(appJs.includes('localhost'), 'app JavaScript must detect local hosts');
  assert(appJs.includes('unregister'), 'app JavaScript must unregister local service workers');
  assert(appJs.includes('caches.delete'), 'app JavaScript must clear local Well Control caches');
  assert(appJs.includes('serviceWorker'), 'app JavaScript must register the service worker outside local development');
}

const serviceWorker = read('service-worker.js');
assert(/well-control-site-[a-f0-9]{12}/.test(serviceWorker), 'service-worker.js cache name must be content-derived');
assert(!serviceWorker.includes('well-control-site-v10'), 'service-worker.js must not use the old manual v10 cache');
assert(serviceWorker.includes('skipWaiting'), 'service-worker.js must activate updated workers promptly');
assert(serviceWorker.includes('clients.claim'), 'service-worker.js must claim clients after activation');
assert(serviceWorker.includes('offline.html'), 'service-worker.js must keep offline fallback coverage');
assert(serviceWorker.includes('assets/build/'), 'service-worker.js must precache hashed build assets');

const manifest = JSON.parse(read('manifest.webmanifest'));
assert(manifest.name === 'Well Control', 'manifest.webmanifest name must stay Well Control');
assert(manifest.icons?.length >= 2, 'manifest.webmanifest must keep app icons');
for (const icon of manifest.icons || []) {
  assert(
    hashedAssetPattern.test(icon.src) && fs.existsSync(path.join(siteDir, icon.src)),
    `manifest icon must reference an existing hashed asset: ${icon.src}`,
  );
}

const headers = read('_headers');
assert(headers.includes('/assets/build/*'), '_headers must target hashed build assets');
assert(headers.includes('max-age=31536000, immutable'), '_headers must give hashed assets immutable caching');
assert(headers.includes('/service-worker.js'), '_headers must target service-worker freshness');
assert(headers.includes('no-cache, must-revalidate'), '_headers must require shell revalidation');

const indexHtml = read('index.html');
const visibleLogoExpectations = new Map([
  ['index.html', 3],
  ['privacy-policy.html', 1],
  ['terms-of-use.html', 1],
  ['educational-disclaimer.html', 1],
]);
const webpLogoSourcePattern =
  /<source\b(?=[^>]*\bsrcset=(?:"[^"]*well-control-logo\.[a-f0-9]{8,}\.webp"|'[^']*well-control-logo\.[a-f0-9]{8,}\.webp'|[^\s>]*well-control-logo\.[a-f0-9]{8,}\.webp))(?=[^>]*\btype=(?:"image\/webp"|'image\/webp'|image\/webp))[^>]*>/gi;
const pngLogoFallbackPattern =
  /<img\b(?=[^>]*\bsrc=(?:"[^"]*well-control-logo\.[a-f0-9]{8,}\.png"|'[^']*well-control-logo\.[a-f0-9]{8,}\.png'|[^\s>]*well-control-logo\.[a-f0-9]{8,}\.png))[^>]*>/gi;
for (const [relativePath, expectedCount] of visibleLogoExpectations) {
  const html = read(relativePath);
  const webpMatches = html.match(webpLogoSourcePattern) || [];
  const pngMatches = html.match(pngLogoFallbackPattern) || [];
  assert(
    webpMatches.length >= expectedCount,
    `${relativePath} must include hashed WebP sources for visible logo markup`,
  );
  assert(
    pngMatches.length >= expectedCount,
    `${relativePath} must include hashed PNG fallbacks for visible logo markup`,
  );
}

const androidDownloadAnchor = indexHtml.match(
  /<a\b(?=[^>]*\bid=(?:"android-direct-download"|'android-direct-download'|android-direct-download)(?:\s|>))([^>]*)>/i,
);
assert(Boolean(androidDownloadAnchor), 'index.html must include android-direct-download link');
if (androidDownloadAnchor) {
  const attributes = androidDownloadAnchor[1];
  const href = htmlAttribute(attributes, 'href');
  const version = htmlAttribute(attributes, 'data-download-version');
  const build = htmlAttribute(attributes, 'data-download-build');
  const updatedAt = htmlAttribute(attributes, 'data-download-updated-at');

  assert(
    href === androidDownload.url,
    'index.html Android download href must match metadata source',
  );
  assert(
    androidDownloadUrlPattern.test(href),
    'index.html Android download href must be a Zealot direct release download URL',
  );
  assert(
    version === androidDownload.version,
    'index.html Android download version must match metadata source',
  );
  assert(
    build === androidDownload.build,
    'index.html Android download build must match metadata source',
  );
  assert(
    updatedAt === androidDownload.updatedAt,
    'index.html Android download updatedAt must match metadata source',
  );
  assert(
    !/Zealot production/i.test(indexHtml),
    'index.html must not expose internal Zealot production wording',
  );
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Reviewed ${siteDir}`);
