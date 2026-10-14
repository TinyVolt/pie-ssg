import { NodeType } from './Node';

export const NAMING_PREFIXES: Record<NodeType, string> = {
  Text: 'text',
  Point: 'p',
  Scalar: 'num',
  Line: 'line',
  Triangle: 'tr',
  Circle: 'circ',
  Ellipse: 'ell',
  BezierQuadratic: 'bq',
  BezierCubic: 'bc',
  Arc: 'arc',
  Dummy: '',
};

export function getPrefixForType(type: NodeType | string): string {
  if (type in NAMING_PREFIXES) {
    return NAMING_PREFIXES[type as NodeType];
  }
  return type.toLowerCase();
}

export class NameGenerator {
  private counters: Record<string, number> = {};

  constructor(private isTaken: (name: string) => boolean = () => false) {}

  public getPrefixForType(type: string): string {
    return getPrefixForType(type);
  }

  public generateAutoName(prefix: string): string {
    /** An empty prefix (Dummy) always gives ''. */
    if (prefix === '') return '';
    let name: string;
    do {
      const current = this.counters[prefix] || 0;
      this.counters[prefix] = current + 1;
      name = `${prefix}${current}`;
    } while (this.isTaken(name));
    return name;
  }

  public resetCounters(): void {
    this.counters = {};
  }
}
