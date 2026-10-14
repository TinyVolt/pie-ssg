import { useParams } from '@solidjs/router';
import { HttpStatusCode } from '@solidjs/start';
import { Show } from 'solid-js';
import 'katex/dist/katex.min.css';
import { renderMarkdown } from '~/lib/markdown';
import { pages } from '~/lib/pages';

export default function Page() {
  const params = useParams();
  const markdown = () => pages.get(params.slug ?? '');

  return (
    <Show
      when={markdown() !== undefined}
      fallback={
        <main>
          <HttpStatusCode code={404} />
          <h1>Page Not Found</h1>
        </main>
      }
    >
      <main innerHTML={renderMarkdown(markdown()!)} />
    </Show>
  );
}
