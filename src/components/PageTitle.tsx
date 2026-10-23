import { Title } from "@solidjs/meta";
import site from "/site.yml";

/** Sets the browser tab title to "<page> – <site title>", or the site title alone when no page title is given. */
export function PageTitle(props: { children?: string }) {
  // A ternary written inside the JSX gets wrapped in a memo, which `@solidjs/meta` reads
  // outside any owner when it removes the tag, causing a "never be disposed" warning.
  const title = () => (props.children ? `${props.children} – ${site.title}` : site.title);
  return <Title>{title()}</Title>;
}
