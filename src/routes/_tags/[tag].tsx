import { useParams } from '@solidjs/router';
import { HttpStatusCode } from '@solidjs/start';
import { For, Show } from 'solid-js';
import { PageMeta } from '~/components/PageMeta';
import { PageTitle } from '~/components/PageTitle';
import { tagAt } from '~/lib/markdown/features/tags/pages';
import { TAGS_URL } from '~/lib/markdown/features/tags/url';

export default function Tag() {
  const params = useParams();

  return (
    <Show
      when={tagAt(params.tag ?? '')}
      keyed
      fallback={
        <main>
          <PageTitle>Page Not Found</PageTitle>
          <HttpStatusCode code={404} />
          <h1>Page Not Found</h1>
        </main>
      }
    >
      {({ tag, pages }) => (
        <main>
          <PageMeta title={`#${tag}`} />
          <h1>#{tag}</h1>
          <ul>
            <For each={pages}>
              {page => (
                <li>
                  <a href={`/${page.slug}`}>{page.title}</a>
                  <Show when={page.description}>
                    <p class="tagged-description">{page.description}</p>
                  </Show>
                </li>
              )}
            </For>
          </ul>
          <p>
            <a href={TAGS_URL}>All tags</a>
          </p>
        </main>
      )}
    </Show>
  );
}
