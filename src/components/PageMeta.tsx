import { Link, Meta } from "@solidjs/meta";
import { useLocation } from "@solidjs/router";
import { Show } from "solid-js";
import site from "/site.yml";
import { PageTitle } from "./PageTitle";

/**
 * The tab title plus the tags for search results and link previews. Each route renders it once:
 * `@solidjs/meta` replaces a `<meta>` only when its content matches too, so a page's tag can't override a default.
 * Empty `title` or `description` falls back to `site.yml`. The canonical link and `og:url` need `site.yml`'s `url`.
 */
export function PageMeta(props: { title?: string; description?: string }) {
  const location = useLocation();
  const ogTitle = () => props.title || site.title;
  const description = () => props.description || site.description;
  return (
    <>
      <PageTitle>{props.title}</PageTitle>
      <Meta property="og:type" content="website" />
      <Meta property="og:site_name" content={site.title} />
      <Meta property="og:title" content={ogTitle()} />
      <Show when={description()}>
        {description => (
          <>
            <Meta name="description" content={description()} />
            <Meta property="og:description" content={description()} />
          </>
        )}
      </Show>
      <Show when={site.url}>
        {url => (
          <>
            <Link rel="canonical" href={url() + location.pathname} />
            <Meta property="og:url" content={url() + location.pathname} />
          </>
        )}
      </Show>
    </>
  );
}
