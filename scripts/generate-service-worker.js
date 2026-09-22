const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const publicDir = path.join(repoRoot, 'public');
const outputPath = path.join(publicDir, 'service-worker.js');
const cachePrefix = 'well-control-site-';
const buildAssetsRelativeDir = 'assets/build';

const stableShell = [
  './',
  'index.html',
  'privacy-policy.html',
  'terms-of-use.html',
  'educational-disclaimer.html',
  'offline.html',
  'manifest.webmanifest',
];

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

function toPublicPath(filePath) {
  return path.relative(publicDir, filePath).split(path.sep).join('/');
}

function sha256ForPackage(paths) {
  const hash = crypto.createHash('sha256');
  for (const publicPath of paths) {
    const diskPath =
      publicPath === './'
        ? path.join(publicDir, 'index.html')
        : path.join(publicDir, publicPath);
    hash.update(publicPath);
    hash.update('\0');
    hash.update(fs.readFileSync(diskPath));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function assertRequiredFiles(paths) {
  for (const publicPath of paths) {
    const diskPath =
      publicPath === './'
        ? path.join(publicDir, 'index.html')
        : path.join(publicDir, publicPath);
    if (!fs.existsSync(diskPath)) {
      throw new Error(`Cannot generate service worker; missing ${publicPath}`);
    }
  }
}

const hashedAssets = walk(path.join(publicDir, buildAssetsRelativeDir), (candidate) =>
  fs.statSync(candidate).isFile(),
)
  .map(toPublicPath)
  .sort();

const precache = Array.from(new Set([...stableShell, ...hashedAssets]));
assertRequiredFiles(precache);

const packageHash = sha256ForPackage(precache).slice(0, 12);
const cacheName = `${cachePrefix}${packageHash}`;

const serviceWorker = `// Generated from public/ by scripts/generate-service-worker.js.
const CACHE = ${JSON.stringify(cacheName)};
const CACHE_PREFIX = ${JSON.stringify(cachePrefix)};
const CORE = ${JSON.stringify(precache, null, 2)};
const SHELL_PATHS = new Set(${JSON.stringify(
  stableShell.filter((entry) => entry !== './'),
  null,
  2,
)});
const HASHED_ASSET_PATTERN = /\\/assets\\/build\\/[^/?]+\\.[a-f0-9]{8,}\\.[^/?]+$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response && response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    if (request.mode === 'navigate') {
      return cache.match('offline.html');
    }
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (HASHED_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  const shellPath = url.pathname.replace(/^\\//, '') || 'index.html';
  if (SHELL_PATHS.has(shellPath)) {
    event.respondWith(networkFirst(request));
  }
});
`;

fs.writeFileSync(outputPath, serviceWorker);
console.log(`Generated service-worker.js with cache ${cacheName}`);
