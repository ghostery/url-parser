import { URL as IURL } from 'url';
import { CODE_FORWARD_SLASH, CODE_HASH, CODE_QUESTION_MARK } from './const';
import ImmutableURL from './immutable-url';

function mutate(url: URL, changes: Partial<URL>): ImmutableURL {
  const self = {
    hash: changes.hash !== undefined ? changes.hash : url.hash,
    host: changes.host !== undefined ? changes.host : url.host,
    hostname: changes.hostname !== undefined ? changes.hostname : url.hostname,
    password: changes.password !== undefined ? changes.password : url.password,
    pathname: changes.pathname !== undefined ? changes.pathname : url.pathname,
    port: changes.port !== undefined ? changes.port : url.port,
    protocol: changes.protocol !== undefined ? changes.protocol : url.protocol,
    search: changes.search !== undefined ? changes.search : url.search,
    username: changes.username !== undefined ? changes.username : url.username,
  };
  if (changes.hostname || changes.port) {
    if (self.protocol === 'https:' && self.port === '443') {
      self.port = '';
    } else if (self.protocol === 'http:' && self.port === '80') {
      self.port = '';
    }
    self.host = `${self.hostname}${self.port ? ':' : ''}${self.port}`;
  }
  const user = self.username
    ? self.password
      ? `${self.username}:${self.password}@`
      : `${self.username}@`
    : self.password
    ? `:${self.password}@`
    : '';
  return new ImmutableURL(
    `${self.protocol}${url.slashes}${user}${self.host}${self.pathname}${self.search}${self.hash}`,
  );
}

export default class URL implements IURL {
  private url: ImmutableURL;

  constructor(url: string) {
    this.url = new ImmutableURL(url);
  }

  public get protocol(): string {
    return this.url.protocol;
  }

  public set protocol(value: string) {
    const previousProtocol = this.url.protocol;
    const colon = value.endsWith(':') ? '' : ':';
    const href = `${value}${colon}${this.href.slice(previousProtocol.length)}`;
    this.url = new ImmutableURL(href);
  }

  public get username(): string {
    return this.url.username;
  }

  public set username(value: string) {
    this.url = mutate(this, {
      username: value || '',
    });
  }

  public get password(): string {
    return this.url.password;
  }

  public set password(value: string) {
    this.url = mutate(this, {
      password: value || '',
    });
  }

  public get hostname(): string {
    return this.url.hostname;
  }

  public set hostname(value: string) {
    this.url = mutate(this, {
      hostname: value || '',
    });
  }

  public get host(): string {
    return this.url.host;
  }

  public set host(value: string) {
    this.url = mutate(this, {
      host: value,
    });
  }

  public get origin(): string {
    return this.url.origin;
  }

  public get port(): string {
    return this.url.port;
  }

  public set port(value: string) {
    this.url = mutate(this, {
      port: value || '',
    });
  }

  public get pathname(): string {
    return this.url.pathname;
  }

  public set pathname(value: string) {
    const pathname =
      value.charCodeAt(0) === CODE_FORWARD_SLASH ? value : `/${value}`;
    this.url = mutate(this, {
      pathname,
    });
  }

  /**
   * The query string component of the URL, including the preceding `?` character.
   * See also: https://developer.mozilla.org/en-US/docs/Web/API/URL/search
   */
  public get search() {
    return this.url.search;
  }

  public set search(value: string) {
    const newQuery =
      value.charCodeAt(0) === CODE_QUESTION_MARK ? value.slice(1) : value;
    this.url = mutate(this, {
      search: newQuery.length > 0 ? `?${newQuery}` : '',
    });
  }

  /**
   * Parsed query string parameters, as a `URLSearchParams` object.
   * See also: https://developer.mozilla.org/en-US/docs/Web/API/URL/searchParams
   */
  public get searchParams() {
    return this.url.searchParams;
  }

  /**
   * Parsed parameter string from the url. These are `;` separated key/values appearing in the URL
   * path, before the query string.
   */
  public get parameters() {
    return this.url.parameters;
  }

  /**
   * Check if the URL has a parameter string
   * @returns true iff `;` occurs in the URL path before a `?`.
   */
  public hasParameterString() {
    return this.url.hasParameterString();
  }

  /**
   * URL hash or fragment component.
   * See also: https://developer.mozilla.org/en-US/docs/Web/API/URL/hash
   */
  public get hash() {
    return this.url.hash;
  }

  public set hash(value: string) {
    const newHash = value.charCodeAt(0) === CODE_HASH ? value.slice(1) : value;
    this.url = mutate(this, {
      hash: newHash.length > 0 ? `#${newHash}` : '',
    });
  }

  public get href(): string {
    return this.url.href;
  }

  public set href(value: string) {
    this.url = new ImmutableURL(value);
  }

  /**
   * Returns the url (post parsing).
   * See also: https://developer.mozilla.org/en-US/docs/Web/API/URL/toString
   */
  public toString() {
    return this.href;
  }

  /**
   * JSONified URL (== toString)
   * See also: https://developer.mozilla.org/en-US/docs/Web/API/URL/toJSON
   */
  public toJSON() {
    return this.href;
  }

  /**
   * Get parsed domainInfo from the hostname.
   * @returns parsed domain, from tldts `parse` method.
   */
  get domainInfo() {
    return this.url.domainInfo;
  }

  /**
   * Returns true iff the hostname of this url is an IP address. False otherwise.
   */
  get hostIsIp() {
    return this.url.hostIsIp;
  }

  /**
   * Returns the hostname of the URL after parsing by tldts. This includes some error correction.
   */
  get domain() {
    return this.url.domain;
  }

  /**
   * Get eTLD+1 of the hostname.
   */
  get generalDomain() {
    return this.url.generalDomain;
  }

  /**
   * Legacy attribute for `pathname`.
   */
  get path() {
    return this.url.path;
  }

  /**
   * Scheme = protocol without a trailing ':'.
   */
  get scheme() {
    return this.url.scheme;
  }

  get slashes() {
    return this.url.slashes;
  }

  /**
   * Check if the hostname of the URL is valid, i.e.
   *  * it is an IP address, or
   *  * it is a valid hostname with a known public suffix.
   * @returns true if host is valid, otherwise false.
   */
  public isValidHost() {
    // if tldts was able to parse it, it's valid
    return this.url.isValidHost();
  }

  /**
   * Non-standard params extractor.
   *
   * Returns search params from parameter string and query params with more aggessive extraction
   * than the standard URL implementation. Extra extraction features are:
   *  * `;` separated parameters - used by multi trackers
   * @returns URLSearchParams
   */
  public extractKeyValues() {
    return this.url.extractKeyValues();
  }
}
