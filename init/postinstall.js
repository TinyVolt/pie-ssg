// Runs after a site installs or upgrades `@tinyvolt/pie`: refreshes the files below from this version.
// A changed file is first backed up, so a user's edits are kept.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

// Package path -> [path in the site, backup path in the site].
const FILES = {
  'init/site-agents.md': ['AGENTS.md', 'AGENTS.old.md'],
  'init/site-vite.config.ts': ['vite.config.ts', 'vite.config.old.ts'],
};

/** The folder of the nearest `package.json` at or above `dir`, or null. */
function findProject(dir) {
  for (let d = dir; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, 'package.json'))) return d;
    if (d === path.dirname(d)) return null;
  }
}

// `INIT_CWD` is where the install command was run. Skip anything that isn't a site depending on this package,
// such as this repo's own `pnpm install` or a one-off `npx @tinyvolt/pie init`.
const app = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const site = process.env.INIT_CWD && findProject(process.env.INIT_CWD);
const sitePkg = site && JSON.parse(fs.readFileSync(path.join(site, 'package.json'), 'utf8'));
if (!sitePkg?.dependencies?.[app.name] && !sitePkg?.devDependencies?.[app.name]) process.exit(0);

for (const [from, [to, backup]] of Object.entries(FILES)) {
  const target = path.join(site, to);
  // A file the user removed stays removed.
  if (!fs.existsSync(target)) continue;
  const fresh = fs.readFileSync(path.join(root, from));
  if (fresh.equals(fs.readFileSync(target))) continue;
  fs.copyFileSync(target, path.join(site, backup));
  fs.writeFileSync(target, fresh);
  console.log(`@tinyvolt/pie: updated ${to}; the old one is in ${backup}.`);
}
