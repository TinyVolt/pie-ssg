<img src="public/logo.svg" alt="pie-ssg logo" width="96">

# pie-ssg

[![npm](https://img.shields.io/npm/v/@tinyvolt/pie)](https://www.npmjs.com/package/@tinyvolt/pie)
[![license](https://img.shields.io/github/license/TinyVolt/pie-ssg)](LICENSE)

A Markdown-based SSG for interactive science explainers

See the [roadmap](ROADMAP.md) for planned features and [documentation](DOCS.md) for existing features.

## Create a site

```sh
npx @tinyvolt/pie init my-site
cd my-site
npm install
npm run dev
```

With pnpm:

```sh
pnpx @tinyvolt/pie init my-site
cd my-site
pnpm install
pnpm dev
```

Leave out `my-site` and it asks for a folder name. The folder must not exist yet, or be empty.

The site installs the app as the `@tinyvolt/pie` package. To update it:

```sh
npm install @tinyvolt/pie@latest
```

Requires Node 24. Package: [@tinyvolt/pie](https://www.npmjs.com/package/@tinyvolt/pie).

## Developing pie-ssg

Requires Node 24 (see `.nvmrc`) and pnpm.

```sh
nvm use
corepack enable
pnpm install
```

## Usage

```sh
pnpm dev       # start the dev server
pnpm build     # build to .output/
pnpm start     # run the built server
pnpm preview   # preview the build with vite
```
