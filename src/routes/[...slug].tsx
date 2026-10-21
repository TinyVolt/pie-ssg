import { createAsync, useParams } from '@solidjs/router';
import { HttpStatusCode } from '@solidjs/start';
import { Match, Switch } from 'solid-js';
import 'katex/dist/katex.min.css';
import { PageTitle } from '~/components/PageTitle';
import { CanvasPage } from '~/lib/markdown/components/CanvasPage';
import { MarkdownBody } from '~/lib/markdown/components/MarkdownBody';
import { loadPage } from '~/lib/markdown/pages';

export default function Page() {
  const params = useParams();
  const page = createAsync(() => loadPage(params.slug ?? ''));

  // `undefined` while loading, `null` when there is no such page.
  // Keyed: a new page gets a fresh canvas and fresh Python variables.
  return (
    <Switch>
      <Match when={page() === null}>
        <main>
          <PageTitle>Page Not Found</PageTitle>
          <HttpStatusCode code={404} />
          <h1>Page Not Found</h1>
        </main>
      </Match>
      <Match when={page()} keyed>
        {(page) => {
          const canvas = page.frontmatter.canvas;
          return (
            <>
              <PageTitle>{page.frontmatter.title}</PageTitle>
              {canvas === 'none' ? <MarkdownBody html={page.html} /> : <CanvasPage side={canvas} html={page.html} />}
            </>
          );
        }}
      </Match>
    </Switch>
  );
}
