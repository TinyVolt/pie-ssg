// Builds `dist/`: the `@tinyvolt/pie/runtime` entry, for showing pie pages inside another app.
// `tsc` writes the JS and its types. It keeps the JSX, for the host's Solid plugin to compile for the browser and the server.
// Then this script fixes what `tsc` leaves as it is, and writes `runtime.css`.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

fs.rmSync(dist, { recursive: true, force: true });
execSync('tsc -p tsconfig.runtime.json', { cwd: root, stdio: 'inherit' });

for (const entry of fs.readdirSync(dist, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const file = path.join(entry.parentPath, entry.name);
  const relative = (to) => {
    const rel = path.relative(entry.parentPath, path.join(dist, to)).split(path.sep).join('/');
    return rel.startsWith('.') ? rel : `./${rel}`;
  };
  const code = fs.readFileSync(file, 'utf8');
  const fixed = code
    // `~/x` is pie's `src/x`, but a host's `~` is its own `src/`.
    .replace(/(from |import\()(['"])~\/([^'"]*)\2/g, (_, before, quote, to) => `${before}${quote}${relative(to)}${quote}`)
    // The worker's file, which Vite finds through `new URL(...)`.
    .replace("new URL('./worker.ts'", "new URL('./worker.js'");
  if (fixed !== code) fs.writeFileSync(file, fixed);
}

// The worker imports these with `?raw`; the host's Vite inlines them.
for (const name of fs.readdirSync(path.join(root, 'src/lib/python/py')).filter(name => name.endsWith('.py'))) {
  fs.cpSync(path.join(root, 'src/lib/python/py', name), path.join(dist, 'lib/python/py', name));
}

// Nesting limits each of `page.css`'s rules to the page.
fs.writeFileSync(path.join(dist, 'runtime.css'), `${read('src/runtime.css')}\n.pie-page {\n${read('src/page.css')}}\n`);
