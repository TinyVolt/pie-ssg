import { NodeType, getNodeDefinition } from './Node';

export function getPrefixForType(type: NodeType | string): string {
  return getNodeDefinition(type)?.prefix ?? type.toLowerCase();
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
