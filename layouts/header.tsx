import site from "../site.yml";

/** The site name and nav links, shown at the top of every page. */
export default function Header() {
  return (
    <header class="site-header">
      <a class="site-header-title" href="/">
        {site.title}
      </a>
      <nav class="site-header-nav">
        <a href="/about">About</a>
        <a href="/pages">Pages</a>
      </nav>
    </header>
  );
}
