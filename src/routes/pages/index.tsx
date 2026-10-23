import { For } from 'solid-js';
import { PageMeta } from '~/components/PageMeta';
import { slugs } from '~/lib/markdown/pages';

export default function Pages() {
  return (
    <main>
      <PageMeta title="Pages" />
      <ul>
        <For each={slugs}>
          {slug => (
            <li>
              <a href={`/${slug}`}>{slug}</a>
            </li>
          )}
        </For>
      </ul>
    </main>
  );
}
