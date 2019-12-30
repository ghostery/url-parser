import { URL } from 'url';
import URLSearchParams from './url-search-params';

/**
 * Wraps URLSearchParams and pushes changes in search string to a parent
 * URL instance.
 */
export default class URLSearchParamsWrapper extends URLSearchParams {
  constructor(private url: URL, init: URLSearchParams) {
    super();
    this.params = init.params;
  }

  public append(name: string, value: string): void {
    super.append(name, value);
    this.url.search = this.toString();
  }

  public delete(name: string) {
    super.delete(name);
    this.url.search = this.toString();
  }

  public set(name: string, value: string): void {
    super.set(name, value);
    this.url.search = this.toString();
  }

  public sort(): void {
    super.sort();
    this.url.search = this.toString();
  }
}
