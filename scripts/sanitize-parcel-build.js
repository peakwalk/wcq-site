const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '..', 'public');

if (!fs.existsSync(publicDir)) {
  process.exit(0);
}

function walk(dir, predicate, matches = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, predicate, matches);
      continue;
    }
    if (predicate(fullPath)) {
      matches.push(fullPath);
    }
  }
  return matches;
}

function stripSourceMapComments(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const cleaned = original
    .replace(/\n?\/\/# sourceMappingURL=.*$/gm, '')
    .replace(/\n?\/\*# sourceMappingURL=.*\*\/\s*$/gm, '\n')
    .replace(/\n{3,}/g, '\n\n');

  if (cleaned !== original) {
    fs.writeFileSync(filePath, cleaned);
  }
}

for (const filePath of walk(publicDir, (candidate) => /\.(?:css|js)$/.test(candidate))) {
  stripSourceMapComments(filePath);
}

for (const filePath of walk(publicDir, (candidate) => candidate.endsWith('.map'))) {
  fs.rmSync(filePath, { force: true });
}
