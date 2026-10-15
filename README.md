# pie-ssg

[![npm](https://img.shields.io/npm/v/@tinyvolt/create-pie)](https://www.npmjs.com/package/@tinyvolt/create-pie)
[![license](https://img.shields.io/github/license/TinyVolt/pie-ssg)](LICENSE)

A markdown based static-site generator for math and science

See the [roadmap](ROADMAP.md) for planned features.

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

## Working with AI
High level design choices are made by humans, and sometimes refined by an LLM. Implementation is delegated to a code assistant. Certain components are reviewed thoroughly and refactored to reduce overdesign and clutter - behavior code assistants are prone to. Other components (mostly frontend ones) are merely skimmed; their correctness is verified in the browser. 

All markdown documents are written by humans unless specified. 

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
