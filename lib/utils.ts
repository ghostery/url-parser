import MutableURL from './url';

/**
 * Checks if this URL's hostname is non-ascii, and if so returns a new URL with the hostname
 * punycoded. Otherwise returns itself.
 */
export function getPunycodeEncoded(toASCII: (s: string) => string, url: MutableURL): MutableURL {
  const punycodedHost = toASCII(url.hostname);
  if (punycodedHost !== url.hostname) {
    return new MutableURL(`${url.protocol}${url.slashes}${punycodedHost}${url.pathname}${url.search}${url.hash}`);
  }
  return url;
}
