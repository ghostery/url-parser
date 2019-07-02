import { URLSearchParams as IURLSearchParams } from 'url';

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch (e) {
    return s;
  }
}

function optionalDecode(s: string): string {
  if (s.indexOf('%') !== -1) {
    return decodeURIComponentSafe(s);
  } else {
    return s;
  }
}

export default class URLSearchParams implements IURLSearchParams {
  public params: Array<[string, string]>;
  public isEncoded = false;

  constructor() {
    this.params = [];
  }

  public *entries() {
    for (let i = 0; i < this.params.length; i += 1) {
      const decoded: [string, string] = [
        optionalDecode(this.params[i][0]),
        optionalDecode(this.params[i][1]),
      ];
      yield decoded;
    }
  }

  public append(name: string, value: string): void {
    this.params.push([name, value]);
  }

  public delete(name: string) {
    this.params = this.params.filter(
      ([key, _]) => optionalDecode(key) !== name,
    );
  }
  public forEach(
    callback: (value: string, name: string, searchParams: this) => void,
  ): void {
    this.params.forEach(([key, value]) => {
      callback(optionalDecode(value), optionalDecode(key), this);
    });
  }
  public get(name: string): string {
    const entry = this.params.find(([k, _]) => optionalDecode(k) === name);
    if (entry) {
      return optionalDecode(entry[1]);
    }
    return null;
  }
  public getAll(name: string): string[] {
    return this.params
      .filter(([key, _]) => optionalDecode(key) === name)
      .map(kv => kv[1]);
  }
  public has(name: string): boolean {
    return this.get(name) !== null;
  }
  public *keys(): IterableIterator<string> {
    for (let i = 0; i < this.params.length; i += 1) {
      yield optionalDecode(this.params[i][0]);
    }
  }

  /**
   * The set() method of the URLSearchParams interface sets the value associated with a given
   * search parameter to the given value. If there were several matching values, this method
   * deletes the others. If the search parameter doesn't exist, this method creates it.
   * @param name
   * @param value
   */
  public set(name: string, value: string): void {
    const firstIndex = this.params.findIndex(
      ([k, _]) => optionalDecode(k) === name,
    );
    if (firstIndex === -1) {
      this.append(name, value);
      return;
    }
    this.delete(name);
    this.params.splice(firstIndex, 0, [name, value]);
  }
  public sort(): void {
    this.params = this.params.sort((a, b) => a[0].localeCompare(b[0]));
  }
  public toString(): string {
    return this.params.map(([k, v]) => `${k}=${v}`).join('&');
  }
  public *values(): IterableIterator<string> {
    for (let i = 0; i < this.params.length; i += 1) {
      yield optionalDecode(this.params[i][1]);
    }
  }
  public [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.entries();
  }
}
