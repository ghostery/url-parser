import { parse } from 'tldts';
import { IResult } from 'tldts/dist/lib/factory';
import { URL as IURL } from 'url';
import URLSearchParams from './url-search-params';

const CODE_HASH = 35;
const CODE_AMPERSAND = 38;
const CODE_FORWARD_SLASH = 47;
const CODE_COLON = 58;
const CODE_SEMICOLON = 59;
const CODE_EQUALS = 61;
const CODE_QUESTION_MARK = 63;
const CODE_AT = 64;
const CODE_SQUARE_BRACKET_OPEN = 91;
const CODE_SQUARE_BRACKET_CLOSE = 93;

const BREAK_HOST_ON = [CODE_FORWARD_SLASH, CODE_HASH, CODE_QUESTION_MARK];

function isValidProtocolChar(code: number) {
  return (
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    (code >= 48 && code <= 57) || // 0-9
    code === 45 || // -
    code === 43
  ); // +
}

/**
 * A Fast implementation of url parsing, mostly API-compatible with the standard URL class while
 * being on average 2-3 times faster. Evaluation of URL components is lazy, so this implementation
 * should be fast for all use-cases.
 *
 * Known differences to standard URL:
 *  * Parameters returned via `URL.searchParams.entries()` are decoded only with
 *    `decodeURIComponent`. This differs to standards parsing in some subtle ways.
 *  * You can iterate a URL parameters array directly via `URL.searchParams.params`. This is around
 *    20% faster than using an iterator.
 *  * Parameter strings are parsed, and accessible via `URL.parameters`.
 *  * Domain parsing with tldts is built in. The `URL.domain` attribute returns output from tldts'
 *    `parseHost` method.
 *  * Hostname validation is not done on initial parse. The `isValidHost()` method is provided for
 *    this purpose.
 *  * Some extra helper methods.
 *
 * See also for common API: https://developer.mozilla.org/en-US/docs/Web/API/URL
 */
export default class URL implements IURL {
  public origin: string;
  public slashes: string;

  private _protocol: string;
  private _username: string;
  private _password: string;
  private _hostname: string;
  private _host: string;
  private _port: string;
  private _pathname: string;
  private _search: string;
  private _hash: string;
  private _href: string;

  private parameterStartIndex: number;
  private queryStartIndex: number;
  private isQueryParsed: boolean;
  private _parameters: URLSearchParams;
  private _query: URLSearchParams;
  private _domainInfo: IResult;
  private parsedParameters: URLSearchParams;

  constructor(url: string) {
    this.parse(url);
  }

  public get protocol(): string {
    return this._protocol;
  }

  public set protocol(value: string) {
    const previousProtocol = this._protocol;
    const colon = value.endsWith(':') ? '' : ':';
    this.href = `${value}${colon}${this.href.slice(previousProtocol.length)}`;
    this.parse(this.href);
  }

  public get username(): string {
    return this._username;
  }

  public set username(value: string) {
    this._username = value;
    this.reparse();
  }

  public get password(): string {
    return this._password;
  }

  public set password(value: string) {
    this._password = value;
    this.reparse();
  }

  public get hostname(): string {
    return this._hostname;
  }

  public set hostname(value: string) {
    this._host = `${value}:${this.port}`;
    this.reparse();
  }

  public get host(): string {
    return this._host;
  }

  public set host(value: string) {
    this._host = value;
    this.reparse();
  }

  public get port(): string {
    return this._port;
  }

  public set port(value: string) {
    if (this.protocol === 'https:' && value === '443') {
      value = '';
    } else if (this.protocol === 'http:' && value === '80') {
      value = '';
    }
    this._port = value;
    this._host = `${this.hostname}${this._port ? ':' : ''}${this._port}`;
    this.reparse();
  }

  public get pathname(): string {
    return this._pathname;
  }

  public set pathname(value: string) {
    const newPath =
      value.charCodeAt(0) === CODE_FORWARD_SLASH ? value : `/${value}`;
    this._pathname = newPath;
    this.reparse();
  }

  /**
   * The query string component of the URL, including the preceding `?` character.
   * See also: https://developer.mozilla.org/en-US/docs/Web/API/URL/search
   */
  public get search() {
    if (!this._search) {
      this._extractParams();
    }
    return this._search;
  }

  public set search(value: string) {
    const newQuery =
      value.charCodeAt(0) === CODE_QUESTION_MARK ? value.slice(1) : value;
    if (this.queryStartIndex === 0) {
      // no existing query: add it to the end of the url
      this.parse(`${this.href}?${newQuery}${this.hash}`);
    } else {
      this.parse(
        `${this.href.slice(0, this.queryStartIndex + 1)}${newQuery}${
          this.hash
        }`,
      );
    }
  }

  /**
   * Parsed query string parameters, as a `URLSearchParams` object.
   * See also: https://developer.mozilla.org/en-US/docs/Web/API/URL/searchParams
   */
  public get searchParams() {
    if (!this.isQueryParsed) {
      this._extractSearchParams();
    }
    return this._query;
  }

  /**
   * Parsed parameter string from the url. These are `;` separated key/values appearing in the URL
   * path, before the query string.
   */
  public get parameters() {
    if (!this.isQueryParsed) {
      this._extractSearchParams();
    }
    return this._parameters;
  }

  /**
   * Check if the URL has a parameter string
   * @returns true iff `;` occurs in the URL path before a `?`.
   */
  public hasParameterString() {
    return this.parameterStartIndex > 0;
  }

  /**
   * URL hash or fragment component.
   * See also: https://developer.mozilla.org/en-US/docs/Web/API/URL/hash
   */
  public get hash() {
    if (!this._search && !this._hash) {
      this._extractParams();
    }
    return this._hash;
  }

  public set hash(value: string) {
    const newHash = value.charCodeAt(0) === CODE_HASH ? value.slice(1) : value;
    if (this.hash === '') {
      // no existing hash: add it to the end of the url
      if (this.href.endsWith('#')) {
        this.href = `${this.href}${newHash}`;
      } else {
        this.href = `${this.href}#${newHash}`;
      }
    } else {
      this.href = `${this.href.slice(
        0,
        this.href.length - this.hash.length,
      )}#${newHash}`;
    }
  }

  public get href(): string {
    return this._href;
  }

  public set href(value: string) {
    this.parse(value);
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
    if (!this._domainInfo) {
      this._domainInfo = parse(this.hostname, {
        extractHostname: false,
      });
    }
    return this._domainInfo;
  }

  /**
   * Returns true iff the hostname of this url is an IP address. False otherwise.
   */
  get hostIsIp() {
    return this.domainInfo.isIp;
  }

  /**
   * Returns the hostname of the URL after parsing by tldts. This includes some error correction.
   */
  get domain() {
    return this.domainInfo.hostname || this.hostname;
  }

  /**
   * Get eTLD+1 of the hostname.
   */
  get generalDomain() {
    return this.domainInfo.domain || this.hostname;
  }

  /**
   * Legacy attribute for `pathname`.
   */
  get path() {
    return this.pathname || '/';
  }

  /**
   * Scheme = protocol without a trailing ':'.
   */
  get scheme() {
    return this.protocol.slice(0, -1);
  }

  /**
   * Check if the hostname of the URL is valid, i.e.
   *  * it is an IP address, or
   *  * it is a valid hostname with a known public suffix.
   * @returns true if host is valid, otherwise false.
   */
  public isValidHost() {
    // if tldts was able to parse it, it's valid
    return this.hostIsIp || this.generalDomain !== null;
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
    if (this.parsedParameters) {
      return this.parsedParameters;
    }
    this.parsedParameters = new URLSearchParams();
    if (this.queryStartIndex === 0 && this.parameterStartIndex === 0) {
      return this.parsedParameters;
    }
    const start = this.parameterStartIndex || this.queryStartIndex;
    const end = this.href.length - 1;
    let index = start;

    if (this.href.charCodeAt(index) === CODE_SEMICOLON) {
      // parameter string starts here
      index = this._extractParamTuples(
        index + 1,
        end,
        this.parsedParameters,
        [CODE_SEMICOLON],
        CODE_EQUALS,
        [CODE_QUESTION_MARK, CODE_HASH],
      );
    }

    if (this.href.charCodeAt(index) === CODE_QUESTION_MARK) {
      // query string starts here
      index = this._extractParamTuples(
        index + 1,
        end,
        this.parsedParameters,
        [CODE_AMPERSAND, CODE_SEMICOLON], // allow '&' or ';' as separators
        CODE_EQUALS,
        [CODE_HASH],
      );
    }
    return this.parsedParameters;
  }

  private _extractHostname(start, end) {
    let portIndex = 0;
    let stopped = false;
    let i = start;
    let ipv6 = false;
    let hasUpper = false;

    // this is a IPv6 address - ignore everything until the closing bracket
    if (this._href.charCodeAt(i) === CODE_SQUARE_BRACKET_OPEN) {
      ipv6 = true;
      for (; i <= end; i += 1) {
        const code = this._href.charCodeAt(i);
        if (code === CODE_SQUARE_BRACKET_CLOSE) {
          // after closed brackets can only be ':' or '/'
          const nextCode = this._href.charCodeAt(i + 1);
          if (nextCode === CODE_COLON) {
            portIndex = i + 1;
            i += 1;
            stopped = true;
          } else if (nextCode === CODE_FORWARD_SLASH) {
            i += 1;
            stopped = true;
          } else if (i !== end) {
            throw new TypeError('expected `:` or `/` after IPv6 address');
          }
          break;
        }
      }
    }

    if (!ipv6) {
      for (; i <= end; i += 1) {
        const code = this._href.charCodeAt(i);
        if (code === CODE_COLON) {
          portIndex = i;
          stopped = true;
          break;
        } else if (code === CODE_AT) {
          // username without password
          this._username = this._href.slice(start, i);
          this._password = '';
          return this._extractHostname(i + 1, end);
        }
        if (BREAK_HOST_ON.indexOf(code) !== -1) {
          stopped = true;
          break;
        } else if (code <= 0x20) {
          throw new TypeError(
            `Invalid character '${this.href[i]}' in hostname`,
          );
        } else if (code >= 65 && code <= 90) {
          hasUpper = true;
        }
      }
    }
    const hostnameEnd = !stopped ? i + 1 : i;
    if (hasUpper) {
      this._href = `${this._href.slice(0, start)}${this._href
        .slice(start, hostnameEnd)
        .toLowerCase()}${this._href.slice(hostnameEnd)}`;
    }
    this._hostname = this._href.slice(start, hostnameEnd);

    if (portIndex > 0) {
      i += 1;
      const portStart = i;
      for (; i <= end; i += 1) {
        const code = this._href.charCodeAt(i);
        if (BREAK_HOST_ON.indexOf(code) !== -1) {
          this._port = this._href.slice(portStart, i);
          break;
        } else if (code === CODE_AT) {
          // this was actually a username and password - extract user:pass, then
          // parse the rest as a plain hostname
          this._username = this._href.slice(start, portIndex || i);
          this._password = this._href.slice(portIndex + 1, i);
          return this._extractHostname(i + 1, end);
        }
      }
      if (!this._port) {
        this._port = this.href.slice(portStart, i);
      }
    }
    this._host = this._href.slice(start, !stopped ? i + 1 : i);
    this.origin = `${this._protocol}//${this._host}`;
    return !stopped ? i + 1 : i;
  }

  private _extractParams() {
    if (this.queryStartIndex > 0) {
      let index = this.queryStartIndex;
      const end = this.href.length - 1;
      if (this.href.charCodeAt(index) === CODE_QUESTION_MARK) {
        let broken = false;
        for (; index <= end; index += 1) {
          if (this.href.charCodeAt(index) === CODE_HASH) {
            broken = true;
            break;
          }
        }
        this._search = this.href.slice(
          this.queryStartIndex,
          broken ? index : end + 1,
        );
        if (this._search.length === 1) {
          this._search = '';
        }
      }
      if (this.href.charCodeAt(index) === CODE_HASH) {
        this._hash = this.href.slice(index, end + 1);
      }
    }
  }

  private _extractSearchParams() {
    this.isQueryParsed = true;
    if (this.queryStartIndex === 0 && this.parameterStartIndex === 0) {
      return;
    }
    const start = this.parameterStartIndex || this.queryStartIndex;
    const end = this.href.length - 1;
    let index = start;

    if (this.href.charCodeAt(index) === CODE_SEMICOLON) {
      // parameter string starts here
      index = this._extractParamTuples(
        index + 1,
        end,
        this._parameters,
        [CODE_SEMICOLON],
        CODE_EQUALS,
        [CODE_QUESTION_MARK, CODE_HASH],
      );
    }
    if (this.href.charCodeAt(index) === CODE_QUESTION_MARK) {
      // query string starts here
      const searchStart = index;
      index = this._extractParamTuples(
        index + 1,
        end,
        this._query,
        [CODE_AMPERSAND],
        CODE_EQUALS,
        [CODE_HASH],
      );
      this._search = this.href.slice(searchStart, index);
      if (this._search.length === 1) {
        this._search = '';
      }
    }
    if (this.href.charCodeAt(index) === CODE_HASH) {
      this._hash = this.href.slice(index, end + 1);
    }
  }

  private _extractParamTuples(
    start: number,
    end: number,
    params: URLSearchParams,
    separators: number[],
    equals: number,
    breakCodes: number[],
  ) {
    let index = start;
    let keyStart = index;
    let keyEnd = 0;
    let valStart = 0;

    for (; index <= end; index += 1) {
      const code = this.href.charCodeAt(index);
      if (code === equals && keyEnd === 0) {
        keyEnd = index;
        valStart = index + 1;
      } else if (separators.indexOf(code) !== -1) {
        // don't add if key and value are empty
        if (index > keyStart) {
          params.append(
            this.href.slice(keyStart, keyEnd || index),
            this.href.slice(valStart || index, index),
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
      params.append(
        this.href.slice(keyStart, keyEnd || index),
        this.href.slice(valStart || index, index),
      );
    }
    return index;
  }

  private parse(url: string) {
    if (!url) {
      throw new TypeError(`${url} is not a valid URL`);
    }
    this._protocol = null;
    this._hostname = null;
    this._host = null;
    this._port = '';
    this._pathname = null;
    this._username = '';
    this._password = '';
    this._search = '';
    this._hash = '';
    this.parameterStartIndex = 0;
    this.queryStartIndex = 0;
    this.isQueryParsed = false;
    this._parameters = new URLSearchParams();
    this._query = new URLSearchParams();
    this._domainInfo = null;
    this.parsedParameters = null;

    let index = 0;
    // end is within bound of url
    let end = url.length - 1;
    // cut whitespace from the beginning and end of url
    while (url.charCodeAt(index) <= 0x20) {
      index += 1;
    }
    while (url.charCodeAt(end) <= 0x20) {
      end -= 1;
    }
    this._href = url.slice(index, end + 1);

    end = this._href.length - 1;
    let hasUpper = false;
    // Parse protocol
    for (; index <= end; index += 1) {
      const code = this._href.charCodeAt(index);
      if (code === CODE_COLON) {
        this._protocol = this._href.slice(0, index + 1);
        if (hasUpper) {
          this._protocol = this._protocol.toLowerCase();
          this._href = `${this._protocol}${this._href.slice(index + 1)}`;
        }
        break;
      } else if (!isValidProtocolChar(code)) {
        // non alphabet character in protocol - not a valid protocol
        throw new TypeError('Invalid URL protocol');
      } else if (code >= 65 && code <= 90) {
        hasUpper = true;
      }
    }

    if (index >= end) {
      throw new TypeError('No protocol');
    }

    // skip '/' after ':'
    this.slashes = '';
    for (index += 1; index < end; index += 1) {
      if (this._href.charCodeAt(index) !== CODE_FORWARD_SLASH) {
        break;
      } else {
        this.slashes += '/';
      }
    }
    if (this.slashes.length >= 2) {
      // Two slashes: Authority is included
      index = this._extractHostname(index, end);
    } else {
      // No authority
      this._host = '';
      this._hostname = '';
      this.origin = 'null';
    }

    if (index >= end) {
      // add trailing slash if missing
      if (this._href.charCodeAt(end) !== CODE_FORWARD_SLASH) {
        this._href += '/';
      }
      this._pathname = '/';
    } else {
      const pathStart = index;
      for (; index <= end; index += 1) {
        const code = this._href.charCodeAt(index);
        if (code === CODE_SEMICOLON && !this.parameterStartIndex) {
          this.parameterStartIndex = index;
        } else if (code === CODE_QUESTION_MARK || code === CODE_HASH) {
          this.queryStartIndex = index;
          break;
        }
      }
      this._pathname =
        this.href.slice(
          pathStart,
          this.queryStartIndex !== 0 ? this.queryStartIndex : end + 1,
        ) || '/';
    }
  }

  private reparse() {
    const user = this.username
      ? this.password
        ? `${this.username}:${this.password}@`
        : `${this.username}@`
      : this.password
      ? `:${this.password}@`
      : '';
    this.parse(
      `${this.protocol}${this.slashes}${user}${this.host}${this.pathname}${
        this.search
      }${this.hash}`,
    );
  }
}
