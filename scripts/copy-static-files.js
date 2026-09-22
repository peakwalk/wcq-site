const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(repoRoot, 'src');
const publicDir = path.join(repoRoot, 'public');

const staticFiles = [
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

const staticDirectories = ['assets'];
const generatedRootAssetPattern =
  /\.[a-f0-9]{8,}\.(?:css|js|png|jpe?g|webp|woff2|ico|svg|webmanifest)$/i;

function removeGeneratedRootAssets() {
  if (!fs.existsSync(publicDir)) {
    return;
  }

  for (const entry of fs.readdirSync(publicDir, { withFileTypes: true })) {
    if (entry.isFile() && generatedRootAssetPattern.test(entry.name)) {
      fs.rmSync(path.join(publicDir, entry.name), { force: true });
    }
  }
}

function copyFile(relativePath) {
  const sourcePath = path.join(sourceDir, relativePath);
  if (!fs.existsSync(sourcePath)) {
    return;
  }

  const targetPath = path.join(publicDir, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function copyDirectory(relativePath) {
  const sourcePath = path.join(sourceDir, relativePath);
  if (!fs.existsSync(sourcePath)) {
    return;
  }

  const targetPath = path.join(publicDir, relativePath);
  fs.cpSync(sourcePath, targetPath, {
    recursive: true,
    force: true,
    filter: (filePath) => path.basename(filePath) !== '.DS_Store',
  });
}

removeGeneratedRootAssets();
fs.mkdirSync(publicDir, { recursive: true });

for (const relativePath of staticFiles) {
  copyFile(relativePath);
}

for (const relativePath of staticDirectories) {
  copyDirectory(relativePath);
}
