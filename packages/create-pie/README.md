# @tinyvolt/create-pie

Creates a new [pie-ssg](https://github.com/TinyVolt/pie-ssg) site: a Markdown-based SSG for interactive science explainers.

## Usage

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

Leave out `my-site` and it asks for a folder name. The folder must not exist yet, or be empty.

Requires Node 24.

## What you get

```
my-site/
  pages/       your markdown pages, served at /pages/<name>
  functions/   your own pie.* functions, callable from Python editors
  public/      static files
  src/         the pie-ssg app
```

## Commands

```sh
npm run dev       # start the dev server
npm run build     # build to .output/
npm run start     # run the built server
npm run preview   # preview the build with vite
```

## Custom functions

Each `functions/**/*.ts` file exports `Node2NodeFunc` objects. A function with `keyword: 'midpoint'` is called from a Python editor as `pie.midpoint(...)`. See `functions/midpoint.ts` for an example.

A keyword used twice, by two of your files or by one of yours and a built-in, fails the build.
