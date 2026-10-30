/** How one field is read: its value when absent, and how to check the raw text. */
export interface Field<T> {
  default: T;
  /** Throws a message that reads after the field name, e.g. "must be one of …". */
  parse: (raw: string) => T;
}

export type Values<F extends Record<string, Field<unknown>>> = { [K in keyof F]: F[K]['default'] };

function oneOf<const T extends readonly string[]>(values: T, fallback: T[number]): Field<T[number]> {
  return {
    default: fallback,
    parse(raw) {
      if (!(values as readonly string[]).includes(raw)) {
        throw new Error(`must be one of ${values.join(', ')}, got ${JSON.stringify(raw)}`);
      }
      return raw as T[number];
    },
  };
}

export function text(fallback: string): Field<string> {
  return { default: fallback, parse: raw => raw };
}

/** `true` or `false`. */
export function boolean(fallback: boolean): Field<boolean> {
  return {
    default: fallback,
    parse(raw) {
      if (raw !== 'true' && raw !== 'false') throw new Error(`must be true or false, got ${JSON.stringify(raw)}`);
      return raw === 'true';
    },
  };
}

/** A path to a `.md` file, or `none`. Empty when absent. */
export function markdownFile(): Field<string> {
  return {
    default: '',
    parse(raw) {
      if (raw !== 'none' && !raw.endsWith('.md')) throw new Error(`must be a .md file or none, got ${JSON.stringify(raw)}`);
      return raw;
    },
  };
}

/**
 * Words written `#tag`, separated by spaces or commas, lowercased and without repeats. Other words are ignored.
 * A tag has only letters, numbers, `-`, `_` and `+`: it's also a URL, and prerendering can't reach one with `/`, `?` or `.`.
 */
export function hashtags(): Field<string[]> {
  return {
    default: [],
    parse(raw) {
      const words = raw.split(/[\s,]+/).map(word => /^#([\p{L}\p{N}_+-]+)$/u.exec(word)?.[1].toLowerCase());
      return [...new Set(words.filter(tag => tag !== undefined))];
    },
  };
}

/** Every frontmatter field a page can set. Keys not listed here are ignored. */
const FIELDS = {
  canvas: oneOf(['left', 'right', 'top', 'bottom', 'none'], 'none'),
  // Empty: the tab shows the site title alone.
  title: text(''),
  // Empty: `site.yml`'s `description`.
  description: text(''),
};

export type Frontmatter = Values<typeof FIELDS>;
export type CanvasSide = Frontmatter['canvas'];

/**
 * Reads flat `key: value` lines, skipping blank ones. Values may be wrapped in single or double quotes.
 * Shared by frontmatter and `site.yml`.
 */
export function parseKeyValues(text: string): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    const kv = /^([A-Za-z_][\w-]*)[ \t]*:[ \t]*(.*?)[ \t]*$/.exec(line);
    if (!kv) throw new Error(`line is not \`key: value\`: ${JSON.stringify(line)}`);
    const [, key, value] = kv;
    if (Object.hasOwn(raw, key)) throw new Error(`key \`${key}\` appears twice`);
    raw[key] = /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value;
  }
  return raw;
}

/** Reads each of `fields` from `raw`, using its default when absent. Unknown keys are ignored. */
export function readFields<F extends Record<string, Field<unknown>>>(fields: F, raw: Record<string, string>): Values<F> {
  const values: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(fields)) {
    try {
      values[key] = Object.hasOwn(raw, key) ? field.parse(raw[key]) : field.default;
    } catch (e) {
      throw new Error(`\`${key}\` ${(e as Error).message}`);
    }
  }
  return values as Values<F>;
}

/** Splits off a `---` block at the very start of the markdown. No block: no fields, whole markdown as body. */
function splitFrontmatter(markdown: string): { raw: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n?^---[ \t]*(?:\r?\n|$)/m.exec(markdown);
  if (!match || match.index !== 0) return { raw: {}, body: markdown };
  return { raw: parseKeyValues(match[1]), body: markdown.slice(match[0].length) };
}

/**
 * Reads the frontmatter of the file at `path`. `raw`: every key it sets, unchecked, for the features to read.
 * Throws, naming `path`, on a malformed block or a bad value.
 */
export function parseFrontmatter(path: string, markdown: string): { frontmatter: Frontmatter; raw: Record<string, string>; body: string } {
  try {
    const { raw, body } = splitFrontmatter(markdown);
    return { frontmatter: readFields(FIELDS, raw), raw, body };
  } catch (e) {
    throw new Error(`${path}: ${(e as Error).message}`);
  }
}
