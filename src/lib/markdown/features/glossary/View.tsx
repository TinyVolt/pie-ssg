import { onCleanup, onMount, type JSX } from 'solid-js';

/** A popup for `term`: the start of its definition, copied from the page's glossary, and a "more" link to all of it. */
function makePopup(term: HTMLElement): HTMLElement {
  const id = term.dataset.term!;
  const definition = document.getElementById(id)!.nextElementSibling!;
  const popup = document.createElement('div');
  popup.className = 'term-popup';
  popup.innerHTML = `<div class="term-popup-text">${definition.innerHTML}</div><a class="term-more" href="#${id}">more</a>`;
  return popup;
}

/** Gives `term` its popup if it has none, and puts it under the term, or over it when the term is in the lower half of the screen. */
function place(term: HTMLElement) {
  const popup = term.querySelector<HTMLElement>(':scope > .term-popup') ?? term.appendChild(makePopup(term));
  const rect = term.getBoundingClientRect();
  const height = document.documentElement.clientHeight;
  const below = rect.bottom < height / 2;
  popup.style.top = below ? `${rect.bottom}px` : '';
  popup.style.bottom = below ? '' : `${height - rect.top}px`;
  popup.style.setProperty('--term-left', `${rect.left}px`);
}

/**
 * `children`, whose glossary terms show a popup on hover. A tap on a term also shows it, for touch screens,
 * and a tap anywhere else hides it. The popup's "more" opens the page's glossary at the term.
 */
export function GlossaryView(props: { data: true; children: JSX.Element }) {
  onMount(() => {
    const onPointerOver = (e: PointerEvent) => {
      const term = (e.target as Element).closest<HTMLElement>('.term');
      if (term) place(term);
    };

    // Capture: runs before the router follows a "more" link, so the glossary is open when it scrolls to the term.
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const inPopup = target.closest('.term-popup') !== null;
      const more = target.closest('.term-more') !== null;
      if (inPopup && !more) return;
      if (more) document.querySelector<HTMLDetailsElement>('.glossary')!.open = true;
      const term = inPopup ? null : target.closest<HTMLElement>('.term');
      for (const open of document.querySelectorAll('.term--open')) if (open !== term) open.classList.remove('term--open');
      if (term) {
        place(term);
        term.classList.toggle('term--open');
      }
    };

    // A popup is fixed to the screen, so it's moved to follow its term.
    const onScroll = () => document.querySelectorAll<HTMLElement>('.term--open, .term:hover').forEach(place);

    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('click', onClick, true);
    document.addEventListener('scroll', onScroll, true);
    onCleanup(() => {
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('scroll', onScroll, true);
    });
  });

  return props.children;
}
