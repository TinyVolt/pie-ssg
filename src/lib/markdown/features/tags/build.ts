import type { MarkedExtension } from 'marked';
import { hashtags } from '../../frontmatter';
import { escapeHtml } from '../../render';
import type { FeatureBuild } from '../build';
import { tagUrl } from './url';

/**
 * `tags: #math #linear-algebra`: the page's tags, as links at the end of its text. Each link opens the page
 * listing the pages with that tag, in `src/routes/_tags/`. Only a page's own frontmatter counts, not `site.yml`.
 */
export const tags: FeatureBuild<string[], true> = {
  field: hashtags(),
  build: (tags, ctx) => (ctx.from === ctx.file && tags.length > 0 ? true : undefined),
  markdown(tags) {
    const links = tags.map(tag => `<a href="${escapeHtml(tagUrl(tag))}">#${escapeHtml(tag)}</a>`).join('');
    return {
      hooks: {
        postprocess: html => `${html}<nav class="tags">${links}</nav>\n`,
      },
    } satisfies MarkedExtension;
  },
};
