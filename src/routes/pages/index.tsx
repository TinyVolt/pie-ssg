import { For } from 'solid-js';
import { PageTitle } from '~/components/PageTitle';
import { slugs } from '~/lib/markdown/pages';

export default function Pages() {
  return (
    <main>
      <PageTitle>Pages</PageTitle>
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
