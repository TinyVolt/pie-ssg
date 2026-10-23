import { PageMeta } from "~/components/PageMeta";
import { layout, type LayoutModules } from "~/lib/layouts/layout";

// Shown when the site has no `layouts/index.tsx`.
function Home() {
  return (
    <main>
      <h1>pie-ssg</h1>
      <h2>A Markdown-based SSG for interactive science explainers</h2>
      <a href="/pages">Pages</a>
    </main>
  );
}

const Layout = layout(import.meta.glob<LayoutModules[string]>("/layouts/index.tsx", { eager: true }), Home);

export default function Index() {
  return (
    <>
      <PageMeta />
      <Layout />
    </>
  );
}
