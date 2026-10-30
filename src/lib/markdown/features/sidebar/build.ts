import { markdownFile } from '../../frontmatter';
import { renderMarkdown } from '../../render';
import type { FeatureBuild } from '../build';

/** `sidebar: _topics.md`: that file's HTML, shown in a sidebar. `none`: no sidebar, even when `site.yml` sets one. */
export const sidebar: FeatureBuild<string, string> = {
  field: markdownFile(),
  build: (file, ctx) => (file === '' || file === 'none' ? undefined : renderMarkdown(ctx.readFile(file))),
};
