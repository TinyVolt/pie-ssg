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
  'public': 'public',
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
