import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { Header as BuiltInHeader } from "./components/Header";
import { PageTitle } from "./components/PageTitle";
import { layout, type LayoutModules } from "./lib/layouts/layout";
import "./app.css";
// Author styles load after `app.css`, so they override it.
import "./authorStyles";

// The site's own `layouts/header.tsx`, or the built-in header.
const Header = layout(import.meta.glob<LayoutModules[string]>("/layouts/header.tsx", { eager: true }), BuiltInHeader);

export default function App() {
  return (
    <Router
      root={props => (
        <MetaProvider>
          {/* Default; a page's own PageTitle overrides it. */}
          <PageTitle />
          <Header />
          <Suspense>{props.children}</Suspense>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
