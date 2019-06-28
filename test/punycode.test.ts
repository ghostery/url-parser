import { toASCII } from 'punycode';
import { getPunycodeEncoded, URL } from '../url-parser';

describe('getPunycodeEncoded', () => {
  it('Converts a non-ASCII hostname to punycode', () => {
    const url = new URL('http://münchen.de');
    const punycoded = getPunycodeEncoded(toASCII, url);
    expect(punycoded.hostname).toBe('xn--mnchen-3ya.de');
  });

  it('Does nothing to ASCII hostnames', () => {
    const url = new URL('http://munchen.de');
    const punycoded = getPunycodeEncoded(toASCII, url);
    expect(punycoded.hostname).toBe('munchen.de');
  });

  it('Does not convert other non-ASCII characters in the URL', () => {
    const path = '/hellöö';
    const url = new URL(`http://münchen.de${path}`);
    const punycoded = getPunycodeEncoded(toASCII, url);
    expect(punycoded.hostname).toBe('xn--mnchen-3ya.de');
    expect(punycoded.pathname).toBe(path);
  });
});
