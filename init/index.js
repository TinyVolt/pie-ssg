#!/usr/bin/env node
// `npx @tinyvolt/pie init [dir]`: creates a new pie-ssg site in `dir`, which installs this package.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

const DEFAULT_DIR = 'pie-site';
const USAGE = 'Usage: npx @tinyvolt/pie init [dir]';
// This package's root. Its example site is where a new site starts.
const root = path.resolve(import.meta.dirname, '..');

// Package path -> path in the new site.
const FILES = {
  'pages': 'pages',
  'functions': 'functions',
  'nodes': 'nodes',
  'styles': 'styles',
  'layouts': 'layouts',
  'public': 'public',
  'site.yml': 'site.yml',
  '.nvmrc': '.nvmrc',
  // Named so tools working on this repo don't load them. npm drops `.gitignore` from packages.
  'init/site-agents.md': 'AGENTS.md',
  'init/site-vite.config.ts': 'vite.config.ts',
  'init/site-tsconfig.json': 'tsconfig.json',
  'init/site-gitignore': '.gitignore',
};

async function askDir() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Project folder (${DEFAULT_DIR}): `);
  rl.close();
  return answer.trim() || DEFAULT_DIR;
}

/** A valid npm package name from the folder name: lowercase, other characters -> `-`. */
const toPackageName = (name) =>
  name.toLowerCase().replace(/[^a-z0-9._~-]+/g, '-').replace(/^[._-]+/, '') || DEFAULT_DIR;

const [command, dirArg] = process.argv.slice(2);
if (command !== 'init') {
  console.error(USAGE);
  process.exit(1);
}

const dir = dirArg || (await askDir());
const target = path.resolve(dir);

if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
  console.error(`${dir} already exists and is not empty. Pick another folder.`);
  process.exit(1);
}

for (const [from, to] of Object.entries(FILES)) {
  fs.cpSync(path.join(root, from), path.join(target, to), { recursive: true });
}
// Claude Code reads `CLAUDE.md`; `@AGENTS.md` loads the guide from there.
fs.writeFileSync(path.join(target, 'CLAUDE.md'), '@AGENTS.md\n');

// The site depends on this exact version, plus its peers at the exact versions it was tested with.
// pnpm only lets a site see its own dependencies, so `vite` (the CLI, the config) and `solid-js` (JSX in `nodes/`) are listed here.
// `--configLoader runner` lets Vite load `@tinyvolt/pie/vite`: Node won't strip TypeScript types under `node_modules`.
const app = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const vite = (command) => `vite ${command} --configLoader runner`;
const pkg = {
  name: toPackageName(path.basename(target)),
  type: 'module',
  scripts: {
    dev: vite('dev'),
    build: vite('build'),
    start: app.scripts.start,
    preview: vite('preview'),
  },
  dependencies: { [app.name]: app.version, ...app.peerDependencies },
  devDependencies: { '@types/node': app.devDependencies['@types/node'], typescript: app.devDependencies.typescript },
  engines: app.engines,
};
fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

const usesPnpm = (process.env.npm_config_user_agent ?? '').startsWith('pnpm');
console.log(`
Created ${dir}. Next:

  cd ${/\s/.test(dir) ? `"${dir}"` : dir}
  ${usesPnpm ? 'pnpm install' : 'npm install'}
  ${usesPnpm ? 'pnpm dev' : 'npm run dev'}
`);
