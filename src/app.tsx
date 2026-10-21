import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { Header } from "./components/Header";
import { PageTitle } from "./components/PageTitle";
import "./app.css";
// Author styles load after `app.css`, so they override it.
import "./authorStyles";

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
