import { CODE_AMPERSAND, CODE_EQUALS, CODE_SPACE } from './const.js';
import { IURLSearchParams } from './types.js';

export default class SearchParams implements IURLSearchParams {
  public get [Symbol.toStringTag]() {
    return 'URLSearchParams' as const;
  }

  public params: [string, string][];
  public isEncoded = false;

  constructor(init?: string | [string, string][] | Record<string, string>) {
    this.params = [];
    if (typeof init === 'string') {
      extractParams(
        init,
        init[0] === '?' ? 1 : 0,
        init.length,
        this,
        [CODE_AMPERSAND],
        CODE_EQUALS,
        [],
        {
          encode: true,
        },
      );
    } else if (Array.isArray(init)) {
      init.forEach((kv) => {
        this.append(kv[0], kv[1]);
      });
    } else if (typeof init === 'object') {
      Object.keys(init).forEach((key) => {
        this.append(key, init[key]);
      });
    }
  }

  public *entries(): URLSearchParamsIterator<[string, string]> {
    for (let i = 0; i < this.params.length; i += 1) {
      yield [
        optionalDecode(this.params[i][0]),
        optionalDecode(this.params[i][1]),
      ];
    }
  }

  public append(name: string, value: string): void {
    this.params.push([encodeParameter(name), encodeParameter(value)]);
  }

  public delete(name: string) {
    this.params = this.params.filter(([key]) => optionalDecode(key) !== name);
  }

  public forEach(
    callback: (value: string, name: string, searchParams: this) => void,
  ): void {
    this.params.forEach(([key, value]) => {
      callback(optionalDecode(value), optionalDecode(key), this);
    });
  }

  public get(name: string): string | null {
    const entry = this.params.find(([k]) => optionalDecode(k) === name);
    if (entry) {
      return optionalDecode(entry[1]);
    }
    return null;
  }

  public getAll(name: string): string[] {
    return this.params
      .filter(([key]) => optionalDecode(key) === name)
      .map((kv) => kv[1]);
  }

  public has(name: string): boolean {
    return this.get(name) !== null;
  }

  public *keys(): URLSearchParamsIterator<string> {
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
      ([k]) => optionalDecode(k) === name,
    );
    if (firstIndex === -1) {
      this.append(name, value);
      return;
    }
    this.delete(name);
    this.params.splice(firstIndex, 0, [
      encodeParameter(name),
      encodeParameter(value),
    ]);
  }

  public sort(): void {
    this.params = this.params.sort((a, b) => a[0].localeCompare(b[0]));
  }

  public toString(): string {
    return this.params.map(([k, v]) => `${k}=${v}`).join('&');
  }

  public *values(): URLSearchParamsIterator<string> {
    for (let i = 0; i < this.params.length; i += 1) {
      yield optionalDecode(this.params[i][1]);
    }
  }

  public [Symbol.iterator](): URLSearchParamsIterator<[string, string]> {
    return this.entries();
  }

  public get size(): number {
    return this.params.length;
  }
}

export function extractParams(
  urlString: string,
  start: number,
  end: number,
  params: SearchParams,
  separators: number[],
  equals: number,
  breakCodes: number[],
  { encode } = { encode: false },
) {
  let index = start;
  let keyStart = index;
  let keyEnd = 0;
  let valStart = 0;
  const appendParams = encode
    ? params.append.bind(params)
    : (n: string, v: string) => params.params.push([n, v]);

  for (; index <= end; index += 1) {
    const code = urlString.charCodeAt(index);
    if (code === equals && keyEnd === 0) {
      keyEnd = index;
      valStart = index + 1;
    } else if (separators.indexOf(code) !== -1) {
      // don't add if key and value are empty
      if (index > keyStart) {
        // push directly to the params array to skip encoding step
        appendParams(
          urlString.slice(keyStart, keyEnd || index),
          urlString.slice(valStart || index, index),
        );
      }

      keyStart = index + 1;
      keyEnd = 0;
      valStart = 0;
    } else if (breakCodes.indexOf(code) !== -1) {
      break;
    }
  }
  // push last key-value
  if (index !== keyStart) {
    appendParams(
      urlString.slice(keyStart, keyEnd || index),
      urlString.slice(valStart || index, index),
    );
  }
  return index;
}

function optionalDecode(s: string): string {
  if (s.indexOf('%') !== -1) {
    try {
      return decodeURIComponent(s.replace(/\+/g, ' '));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e: unknown) {
      return s;
    }
  } else {
    return s;
  }
}

function encodeParameter(_s: string): string {
  const s = '' + _s;
  let encoded = '';
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) === CODE_SPACE) {
      encoded += '+';
    } else {
      encoded += encodeURIComponent(s[i]);
    }
  }
  return encoded;
}
