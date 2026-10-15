# pie-ssg
A markdown based static-site generator for math and science

See the [roadmap](ROADMAP.md) for planned features.

## Working with AI
High level design choices are made by humans, and sometimes refined by an LLM. Implementation is delegated to a code assistant. Certain components are reviewed thoroughly and refactored to reduce overdesign and clutter - behavior code assistants are prone to. Other components (mostly frontend ones) are merely skimmed; their correctness is verified in the browser. 

All markdown documents are written by humans unless specified. 

## Setup

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
