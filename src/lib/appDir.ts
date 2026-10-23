import path from 'node:path';

/** The app's `src/` folder: in this repo, or in `node_modules/@tinyvolt/pie` in a site. */
export const APP_DIR = path.resolve(import.meta.dirname, '..');
