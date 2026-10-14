import { useParams } from '@solidjs/router';
import { HttpStatusCode } from '@solidjs/start';
import { Show } from 'solid-js';
import 'katex/dist/katex.min.css';
import { CanvasPage } from '~/lib/markdown/components/CanvasPage';
import { pages } from '~/lib/markdown/pages';
import { renderMarkdown } from '~/lib/markdown/render';

export default function Page() {
  const params = useParams();
  const page = () => pages.get(params.slug ?? '');
  const canvasSide = () => {
    const canvas = page()?.frontmatter.canvas;
    return canvas === 'none' ? undefined : canvas;
  };

  return (
    <Show
      when={page()}
      fallback={
        <main>
          <HttpStatusCode code={404} />
          <h1>Page Not Found</h1>
        </main>
      }
    >
      {(page) => (
        <Show when={canvasSide()} keyed fallback={<main innerHTML={renderMarkdown(page().body)} />}>
          {(side) => <CanvasPage side={side} html={renderMarkdown(page().body)} />}
        </Show>
      )}
    </Show>
  );
}
