<img src="public/logo.svg" alt="pie-ssg logo" width="96">

# pie-ssg

[![npm](https://img.shields.io/npm/v/@tinyvolt/create-pie)](https://www.npmjs.com/package/@tinyvolt/create-pie)
[![license](https://img.shields.io/github/license/TinyVolt/pie-ssg)](LICENSE)

A Markdown-based SSG for interactive science explainers

See the [roadmap](ROADMAP.md) for planned features and [documentation](DOCS.md) for existing features.

## Create a site

```sh
npm create @tinyvolt/pie my-site
cd my-site
npm install
npm run dev
```

With pnpm:

```sh
pnpm create @tinyvolt/pie my-site
cd my-site
pnpm install
pnpm dev
```

Requires Node 24. Package: [@tinyvolt/create-pie](https://www.npmjs.com/package/@tinyvolt/create-pie).

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
