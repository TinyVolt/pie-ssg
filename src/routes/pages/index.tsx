import { For } from 'solid-js';
import { slugs } from '~/lib/markdown/pages';

export default function Pages() {
  return (
    <main>
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
