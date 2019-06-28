import { URLSearchParams as IURLSearchParams } from 'url';

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch (e) {
    return s;
  }
}

export default class URLSearchParams implements IURLSearchParams {
  public params: Array<[string, string]>;

  constructor() {
    this.params = [];
  }

  public * entries() {
    for (let i = 0; i < this.params.length; i += 1) {
      const decoded: [string, string] = [
        decodeURIComponentSafe(this.params[i][0]),
        decodeURIComponentSafe(this.params[i][1]),
      ];
      yield decoded;
    }
  }

  public append(name: string, value: string): void {
    this.params.push([name, value]);
  }

  public delete(name: string) {
    throw new Error('Method not implemented.');
  }
  public forEach(callback: (value: string, name: string, searchParams: this) => void): void {
    throw new Error('Method not implemented.');
  }
  public get(name: string): string {
    throw new Error('Method not implemented.');
  }
  public getAll(name: string): string[] {
    throw new Error('Method not implemented.');
  }
  public has(name: string): boolean {
    throw new Error('Method not implemented.');
  }
  public keys(): IterableIterator<string> {
    throw new Error('Method not implemented.');
  }
  public set(name: string, value: string): void {
    throw new Error('Method not implemented.');
  }
  public sort(): void {
    throw new Error('Method not implemented.');
  }
  public toString(): string {
    throw new Error('Method not implemented.');
  }
  public values(): IterableIterator<string> {
    throw new Error('Method not implemented.');
  }
  public [Symbol.iterator](): IterableIterator<[string, string]> {
    throw new Error('Method not implemented.');
  }
}
