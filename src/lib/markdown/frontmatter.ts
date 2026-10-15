/** How one frontmatter field is read: its value when absent, and how to check the raw text. */
interface Field<T> {
  default: T;
  /** Throws a message that reads after the field name, e.g. "must be one of …". */
  parse: (raw: string) => T;
}

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

/** Every frontmatter field a page can set. Keys not listed here are ignored. */
const FIELDS = {
  canvas: oneOf(['left', 'right', 'top', 'bottom', 'none'], 'none'),
};

export type Frontmatter = { [K in keyof typeof FIELDS]: (typeof FIELDS)[K]['default'] };
export type CanvasSide = Frontmatter['canvas'];

/**
 * Splits off a `---` block of flat `key: value` lines at the very start of the markdown.
 * Values may be wrapped in single or double quotes. No block: no fields, whole markdown as body.
 */
function splitFrontmatter(markdown: string): { raw: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n?^---[ \t]*(?:\r?\n|$)/m.exec(markdown);
  if (!match || match.index !== 0) return { raw: {}, body: markdown };

  const raw: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === '') continue;
    const kv = /^([A-Za-z_][\w-]*)[ \t]*:[ \t]*(.*?)[ \t]*$/.exec(line);
    if (!kv) throw new Error(`frontmatter line is not \`key: value\`: ${JSON.stringify(line)}`);
    const [, key, value] = kv;
    if (Object.hasOwn(raw, key)) throw new Error(`frontmatter key \`${key}\` appears twice`);
    raw[key] = /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value;
  }
  return { raw, body: markdown.slice(match[0].length) };
}

/** Reads the frontmatter of the file at `path`. Throws, naming `path`, on a malformed block or a bad value. */
export function parseFrontmatter(path: string, markdown: string): { frontmatter: Frontmatter; body: string } {
  try {
    const { raw, body } = splitFrontmatter(markdown);
    const frontmatter: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(FIELDS)) {
      try {
        frontmatter[key] = Object.hasOwn(raw, key) ? field.parse(raw[key]) : field.default;
      } catch (e) {
        throw new Error(`\`${key}\` ${(e as Error).message}`);
      }
    }
    return { frontmatter: frontmatter as Frontmatter, body };
  } catch (e) {
    throw new Error(`${path}: ${(e as Error).message}`);
  }
}
