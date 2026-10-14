import { For } from 'solid-js';
import { pages } from '~/lib/markdown/pages';

export default function Pages() {
  return (
    <main>
      <ul>
        <For each={[...pages.keys()]}>
          {slug => (
            <li>
              <a href={`/pages/${slug}`}>{slug}</a>
            </li>
          )}
        </For>
      </ul>
    </main>
  );
}
