#!/usr/bin/env node
// `npm create @tinyvolt/pie [dir]`: copies the pie-ssg app into `dir`.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

const DEFAULT_DIR = 'pie-site';
const template = path.join(import.meta.dirname, 'template');

async function askDir() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Project folder (${DEFAULT_DIR}): `);
  rl.close();
  return answer.trim() || DEFAULT_DIR;
}

/** A valid npm package name from the folder name: lowercase, other characters -> `-`. */
const toPackageName = (name) =>
  name.toLowerCase().replace(/[^a-z0-9._~-]+/g, '-').replace(/^[._-]+/, '') || DEFAULT_DIR;

const dir = process.argv[2] || (await askDir());
const target = path.resolve(dir);

if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
  console.error(`${dir} already exists and is not empty. Pick another folder.`);
  process.exit(1);
}

fs.cpSync(template, target, { recursive: true });
fs.renameSync(path.join(target, '_gitignore'), path.join(target, '.gitignore'));

const pkgPath = path.join(target, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.name = toPackageName(path.basename(target));
// Pins pnpm; with Corepack on, it would stop npm from running in the project.
delete pkg.packageManager;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

const usesPnpm = (process.env.npm_config_user_agent ?? '').startsWith('pnpm');
console.log(`
Created ${dir}. Next:

  cd ${/\s/.test(dir) ? `"${dir}"` : dir}
  ${usesPnpm ? 'pnpm install' : 'npm install'}
  ${usesPnpm ? 'pnpm dev' : 'npm run dev'}
`);
