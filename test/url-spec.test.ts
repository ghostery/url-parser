import { toASCII } from 'punycode';
import { URL as URLSpec } from 'url';
import { getPunycodeEncoded, URL } from '../url-parser';

describe('URL Spec', () => {
  function compareParameters(u1, u2) {
    const url1Params = u1.searchParams.entries();
    const url2Params = u2.searchParams.entries();
    let param1 = url1Params.next();
    let param2 = url2Params.next();
    while (!param1.done || !param2.done) {
      expect(param2.done).toBe(param1.done);
      expect(param2.value[0]).toBe(param1.value[0]);
      expect(param2.value[1]).toBe(param1.value[1]);
      param1 = url1Params.next();
      param2 = url2Params.next();
    }
  }

  function testURLEquals(actual, expected) {
    expect(actual.hash).toBe(expected.hash);
    expect(actual.host).toBe(expected.host);
    expect(actual.hostname).toBe(expected.hostname);
    expect(actual.href).toBe(expected.href);
    expect(actual.origin).toBe(expected.origin);
    expect(actual.password).toBe(expected.password);
    expect(actual.pathname).toBe(expected.pathname);
    expect(actual.protocol).toBe(expected.protocol);
    expect(actual.search).toBe(expected.search);
    expect(actual.username).toBe(expected.username);

    expect(actual.toString()).toBe(expected.toString());
    expect(actual.toJSON()).toBe(expected.toJSON());

    compareParameters(expected, actual);
  }

  [
    'http://cliqz.com/',
    'https://cliqz.com',
    'https://www.ghostery.com/test?awesome=true#page=1',
    'https://www.example.com/test;a=2?awesome=true#page=1',
    'http://192.168.1.1/page',
    'http://userid@example.com:8080/',
    'http://[2001:4860:0:2001::68]/',
    'https://[2001:db8:85a3:8d3:1319:8a2e:370:7348]:444/',
    'about:blank',
    'mailto:Cliqz <info@cliqz.com>',
    'view-source:https://cliqz.com',
    'data:text/plain,hello',
    'about:debugging',
    'HTTP://CAPS.EXAMPLE.COM/WhAT?',
    'http://xn--mnchen-3ya.de/',
  ].forEach((urlString: string) => {
    it(urlString, () => {
      const expected = new URLSpec(urlString);
      const actual = new URL(urlString);
      testURLEquals(actual, expected);
    });
  });

  [
    undefined,
    null,
    false,
    true,
    1,
    '',
    'http?://example.com',
    'example.com',
    'example.com/test',
    '/test',
    'https://[::-1]foobar:42/',
    'http//example.com',
  ].forEach((urlString: string) => {
    it(`throws for ${urlString}`, () => {
      expect(() => new URLSpec(urlString)).toThrow();
      expect(() => new URL(urlString)).toThrow();
    });
  });

  describe('Mutation', () => {
    const urlString = 'https://user:pass@example.com:8080/test?query=test#title';

    const testMutation = (name: string, mutate: (url: URLSpec) => void, startUrl = urlString) => {
      it(name, () => {
        const expected = new URLSpec(startUrl);
        const actual = new URL(startUrl);
        mutate(expected);
        mutate(actual);
        testURLEquals(actual, expected);
      });
    };

    testMutation('protocol', (url) => {
      url.protocol = 'http:';
    });

    testMutation('protocol without trailing semi-colon', (url) => {
      url.protocol = 'http';
    });

    testMutation('href', (url) => {
      url.href = 'http://cliqz.com/example';
    });

    testMutation('username', (url) => {
      url.username = 'testuser';
    });

    testMutation('password', (url) => {
      url.password = 'passw0rd';
    });

    testMutation('hostname', (url) => {
      url.hostname = 'cliqz.com';
    });

    testMutation('host', (url) => {
      url.host = 'cliqz.com:8000';
    });

    testMutation('port', (url) => {
      url.port = '8000';
    });

    testMutation('port (default)', (url) => {
      url.port = '443';
    });

    testMutation('port and protocol', (url) => {
      url.port = '443';
      url.protocol = 'http:';
    });

    testMutation('protocol and port', (url) => {
      url.protocol = 'https:';
      url.port = '443';
    });

    testMutation('pathname', (url) => {
      url.pathname = 'index.html';
    });

    testMutation('pathname (leading /)', (url) => {
      url.pathname = '/index.html';
    });

    testMutation('search', (url) => {
      url.search = 'test=query';
    });

    testMutation('search (leading ?)', (url) => {
      url.search = '?test=query';
    });

    testMutation('hash', (url) => {
      url.hash = '#anchor';
    });

    testMutation('hash (leading #)', (url) => {
      url.hash = '#anchor';
    });

    testMutation('protocol and hostname flip', (url) => {
      url.protocol = 'http:';
      url.hostname = 'www.example.com';
    }, 'https://cliqz.com/');
  });
});

describe('Divergence from URL Spec', () => {
  it('Does not parse relative paths', () => {
    const urlString = 'https://cliqz.com/test/../';
    const expected = new URLSpec(urlString);
    const actual = new URL(urlString);

    expect(actual.hash).toBe(expected.hash);
    expect(actual.host).toBe(expected.host);
    expect(actual.hostname).toBe(expected.hostname);
    expect(actual.origin).toBe(expected.origin);
    expect(actual.password).toBe(expected.password);
    expect(actual.protocol).toBe(expected.protocol);
    expect(actual.search).toBe(expected.search);
    expect(actual.username).toBe(expected.username);

    expect(actual.href).toBe(urlString);
    expect(actual.pathname).toBe('/test/../');
    expect(expected.pathname).toBe('/');
  });

  it('Does not automatically convert punycode hostnames', () => {
    const urlString = 'http://münchen.de';
    const expected = new URLSpec(urlString);
    const actual = new URL(urlString);

    expect(actual.hash).toBe(expected.hash);
    expect(actual.password).toBe(expected.password);
    expect(actual.pathname).toBe(expected.pathname);
    expect(actual.protocol).toBe(expected.protocol);
    expect(actual.search).toBe(expected.search);
    expect(actual.username).toBe(expected.username);

    // hostname and origin is not converted to punycode by FastURL
    expect(actual.host).toBe('münchen.de');
    expect(actual.hostname).toBe('münchen.de');
    expect(expected.hostname).toBe('xn--mnchen-3ya.de');

    // conversion can be achieved via `getPunycodeEncoded`
    const encoded = getPunycodeEncoded(toASCII, actual);
    expect(encoded.host).toBe(expected.host);
    expect(encoded.hostname).toBe(expected.hostname);
    expect(encoded.href).toBe(expected.href);
    expect(encoded.origin).toBe(expected.origin);
  });
});
