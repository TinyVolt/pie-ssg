// Runs before `npm pack` / `npm publish`: copies the app from the repo root into `template/`.
import fs from 'node:fs';
import path from 'node:path';

const here = import.meta.dirname;
const root = path.resolve(here, '../..');
const template = path.join(here, 'template');

// Repo path -> path inside the template. npm drops `.gitignore` from packages, so it ships as `_gitignore`.
const ENTRIES = {
  'src': 'src',
  'pages': 'pages',
  'functions': 'functions',
  'styles': 'styles',
  'public': 'public',
  'site.yml': 'site.yml',
  'vite.config.ts': 'vite.config.ts',
  'tsconfig.json': 'tsconfig.json',
  '.nvmrc': '.nvmrc',
  'package.json': 'package.json',
  '.gitignore': '_gitignore',
};

fs.rmSync(template, { recursive: true, force: true });
for (const [from, to] of Object.entries(ENTRIES)) {
  fs.cpSync(path.join(root, from), path.join(template, to), { recursive: true });
}

// Pin each direct dependency to the exact version installed in the repo, so new sites
// get the versions this repo was tested with, not whatever is latest that day.
const pkgPath = path.join(template, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
for (const field of ['dependencies', 'devDependencies']) {
  for (const name of Object.keys(pkg[field] ?? {})) {
    const installed = path.join(root, 'node_modules', name, 'package.json');
    if (!fs.existsSync(installed)) {
      throw new Error(`${name} is not installed in the repo. Run \`pnpm install\` at the repo root first.`);
    }
    pkg[field][name] = JSON.parse(fs.readFileSync(installed, 'utf8')).version;
  }
}
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
