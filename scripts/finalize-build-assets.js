const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(repoRoot, 'src');
const sourceAssetsDir = path.join(sourceDir, 'assets');
const publicDir = path.join(repoRoot, 'public');
const buildAssetsRelativeDir = 'assets/build';
const buildAssetsDir = path.join(publicDir, buildAssetsRelativeDir);
const productionOrigin = 'https://well-control.eaxmarketplace.com';

const stableShellFiles = [
  'manifest.webmanifest',
  'robots.txt',
  'sitemap.xml',
  '_headers',
  '.htaccess',
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

const rootBuildAssetPattern =
  /\.[a-f0-9]{8,}\.(?:css|js|png|jpe?g|webp|woff2?|ico|svg)$/i;
const rootGeneratedManifestPattern = /\.([a-f0-9]{8,})\.webmanifest$/i;
const hashableSourceAssetPattern = /\.(?:png|jpe?g|webp|ico|svg)$/i;
const textFilePattern =
  /\.(?:html|css|js|json|webmanifest|xml|txt|svg)$/i;

function assertPublicDir() {
  if (!fs.existsSync(publicDir)) {
    throw new Error('Missing public/; run Parcel build before finalizing assets.');
  }
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

function hashFile(filePath, length = 10) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('hex')
    .slice(0, length);
}

function copyStableShellFiles() {
  for (const relativePath of stableShellFiles) {
    const sourcePath = path.join(sourceDir, relativePath);
    if (!fs.existsSync(sourcePath)) {
      continue;
    }

    const targetPath = path.join(publicDir, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function moveGeneratedRootAssets() {
  const movedAssets = new Map();

  for (const entry of fs.readdirSync(publicDir, { withFileTypes: true })) {
    if (!entry.isFile() || !rootBuildAssetPattern.test(entry.name)) {
      continue;
    }

    const sourcePath = path.join(publicDir, entry.name);
    const relativeTarget = `${buildAssetsRelativeDir}/${entry.name}`;
    const targetPath = path.join(publicDir, relativeTarget);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.renameSync(sourcePath, targetPath);
    movedAssets.set(entry.name, relativeTarget);
  }

  return movedAssets;
}

function hashCopySourceImages() {
  const sourceAssetMap = new Map();

  for (const sourcePath of walk(sourceAssetsDir, (candidate) =>
    hashableSourceAssetPattern.test(candidate),
  )) {
    const originalName = path.basename(sourcePath);
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const hashedName = `${baseName}.${hashFile(sourcePath)}${ext}`;
    const relativeTarget = `${buildAssetsRelativeDir}/${hashedName}`;
    const targetPath = path.join(publicDir, relativeTarget);

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
    sourceAssetMap.set(originalName, relativeTarget);
  }

  return sourceAssetMap;
}

function removeGeneratedManifestFiles() {
  for (const entry of fs.readdirSync(publicDir, { withFileTypes: true })) {
    if (entry.isFile() && rootGeneratedManifestPattern.test(entry.name)) {
      fs.rmSync(path.join(publicDir, entry.name), { force: true });
    }
  }
}

function replaceAll(content, from, to) {
  return content.split(from).join(to);
}

function rewriteTextReferences(movedAssets, sourceAssetMap) {
  const textFiles = walk(publicDir, (candidate) => textFilePattern.test(candidate));

  for (const filePath of textFiles) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    for (const [fileName, relativeTarget] of movedAssets) {
      content = replaceAll(content, `./${fileName}`, `./${relativeTarget}`);
      content = replaceAll(content, fileName, relativeTarget);
    }

    content = content.replace(
      /(?:\.\/)?manifest\.[a-f0-9]{8,}\.webmanifest/gi,
      'manifest.webmanifest',
    );

    for (const [fileName, relativeTarget] of sourceAssetMap) {
      content = replaceAll(
        content,
        `${productionOrigin}/assets/${fileName}`,
        `${productionOrigin}/${relativeTarget}`,
      );
      content = replaceAll(content, `./assets/${fileName}`, `./${relativeTarget}`);
      content = replaceAll(content, `assets/${fileName}`, relativeTarget);
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content);
    }
  }
}

function restoreCanonicalLinks() {
  for (const [relativePath, canonicalUrl] of canonicalUrls) {
    const filePath = path.join(publicDir, relativePath);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const original = fs.readFileSync(filePath, 'utf8');
    const content = original.replace(
      /(<link\s+rel=canonical\s+href=)(?:"[^"]+"|'[^']+'|[^\s>]+)/i,
      `$1${canonicalUrl}`,
    );

    if (content !== original) {
      fs.writeFileSync(filePath, content);
    }
  }
}

function pruneUnreferencedBuildAssets() {
  const referenced = new Set();
  const textFiles = walk(publicDir, (candidate) => textFilePattern.test(candidate));
  const buildAssetReferencePattern =
    /(?:https:\/\/well-control\.eaxmarketplace\.com\/)?assets\/build\/[A-Za-z0-9._-]+/g;

  for (const filePath of textFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    let match;
    while ((match = buildAssetReferencePattern.exec(content))) {
      referenced.add(match[0].replace(`${productionOrigin}/`, ''));
    }
  }

  for (const filePath of walk(buildAssetsDir, (candidate) => fs.statSync(candidate).isFile())) {
    const relativePath = path.relative(publicDir, filePath).split(path.sep).join('/');
    if (!referenced.has(relativePath)) {
      fs.rmSync(filePath, { force: true });
    }
  }
}

assertPublicDir();
fs.mkdirSync(buildAssetsDir, { recursive: true });
copyStableShellFiles();

const movedAssets = moveGeneratedRootAssets();
const sourceAssetMap = hashCopySourceImages();

rewriteTextReferences(movedAssets, sourceAssetMap);
removeGeneratedManifestFiles();
restoreCanonicalLinks();
pruneUnreferencedBuildAssets();

console.log(`Finalized hashed build assets in ${path.relative(repoRoot, buildAssetsDir)}`);
