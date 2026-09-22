const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'pages.yml');
const failures = [];

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

assert(fs.existsSync(workflowPath), 'Missing .github/workflows/pages.yml');

const workflow = fs.existsSync(workflowPath)
  ? fs.readFileSync(workflowPath, 'utf8')
  : '';

const requiredFragments = [
  'name: Deploy to GitHub Pages',
  'push:',
  'branches:',
  '- main',
  'workflow_dispatch:',
  'contents: read',
  'pages: write',
  'id-token: write',
  'group: pages',
  'cancel-in-progress: true',
  'uses: actions/checkout@v4',
  'uses: actions/configure-pages@v5',
  'uses: actions/setup-node@v4',
  'node-version-file: .nvmrc',
  'cache: yarn',
  'run: corepack enable',
  'run: yarn install --frozen-lockfile --non-interactive',
  'run: yarn test',
  'uses: actions/upload-pages-artifact@v4',
  'path: public',
  'needs: build',
  'name: github-pages',
  'url: ${{ steps.deployment.outputs.page_url }}',
  'uses: actions/deploy-pages@v4',
];

for (const fragment of requiredFragments) {
  assert(workflow.includes(fragment), `GitHub Pages workflow is missing: ${fragment}`);
}

assert(!workflow.includes('npm ci'), 'GitHub Pages workflow must use Yarn, not npm ci');
assert(!workflow.includes('npm run build'), 'GitHub Pages workflow must use yarn test');
assert(
  /permissions:\s*\n\s+contents: read\s*\n\s+pages: write\s*\n\s+id-token: write/.test(workflow),
  'GitHub Pages workflow permissions must stay minimal and explicit',
);
assert(
  /deploy:\s*\n\s+needs: build/.test(workflow),
  'GitHub Pages deployment must wait for the build job',
);

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Reviewed ${path.relative(repoRoot, workflowPath)}`);
