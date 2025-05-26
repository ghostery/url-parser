import { parse } from 'tldts-experimental';
import {
  CODE_AMPERSAND,
  CODE_AT,
  CODE_COLON,
  CODE_EQUALS,
  CODE_FORWARD_SLASH,
  CODE_HASH,
  CODE_QUESTION_MARK,
  CODE_SEMICOLON,
  CODE_SQUARE_BRACKET_CLOSE,
  CODE_SQUARE_BRACKET_OPEN,
} from './const.js';
import { IURLExtended } from './types.js';
import URLSearchParams, { extractParams } from './url-search-params.js';

type IResult = ReturnType<typeof parse>;

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
 *  * Domain parsing with tldts is built in. The `URL.domainInfo` attribute returns output from tldts'
 *    `parseHost` method.
 *  * Hostname validation is not done on initial parse. The `isValidHost()` method is provided for
 *    this purpose.
 *  * Some extra helper methods.
 *
 * See also for common API: https://developer.mozilla.org/en-US/docs/Web/API/URL
 */
export default class implements IURLExtended {
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
  private _domainInfo: IResult | null;
  private parsedParameters: URLSearchParams | null;

  constructor(url: string) {
    this.parse(url);
  }

  public get protocol(): string {
    return this._protocol;
  }

  public get username(): string {
    return this._username;
  }

  public get password(): string {
    return this._password;
  }

  public get hostname(): string {
    return this._hostname;
  }

  public get host(): string {
    return this._host;
  }
  public get port(): string {
    return this._port;
  }

  public get pathname(): string {
    return this._pathname;
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

  public get href(): string {
    return this._href;
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
  get domainInfo(): ReturnType<typeof parse> {
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

  private _extractHostname(start: number, end: number): number {
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
      let nonNumeric = false;
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
        } else if (code < 48 || code > 57) {
          // non numeric character in port
          nonNumeric = true;
        }
      }
      if (!this._port) {
        this._port = this.href.slice(portStart, i);
      }
      // validate port - cannot contain non-numeric characters
      if (nonNumeric) {
        throw new TypeError('Invalid URL: port contains non numeric character');
      }
      // cannot be greater than 65535
      if (this._port.length >= 5 && +this._port > 65535) {
        throw new TypeError('Invalid URL: invalid port number');
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
    return extractParams(
      this.href,
      start,
      end,
      params,
      separators,
      equals,
      breakCodes,
    );
  }

  private parse(url: string) {
    if (typeof url !== 'string' || url.length === 0) {
      throw new TypeError(`${url} is not a valid URL`);
    }

    this._protocol = '';
    this._hostname = '';
    this._host = '';
    this._port = '';
    this._pathname = '';
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
}
