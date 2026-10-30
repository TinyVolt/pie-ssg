import { For } from 'solid-js';
import { PageMeta } from '~/components/PageMeta';
import { allTags } from '~/lib/markdown/features/tags/pages';
import { tagUrl } from '~/lib/markdown/features/tags/url';

export default function Tags() {
  return (
    <main>
      <PageMeta title="Tags" />
      <h1>Tags</h1>
      <ul>
        <For each={allTags}>
          {({ tag, pages }) => (
            <li>
              <a href={tagUrl(tag)}>#{tag}</a> ({pages.length})
            </li>
          )}
        </For>
      </ul>
    </main>
  );
}
