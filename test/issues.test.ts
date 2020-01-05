import { URL } from '..';

describe('Github', () => {
  it('Issue 22: Unable to set querystring', () => {
    const url = new URL('https://github.com');
    url.searchParams.set('key', 'value');
    expect(url.href).toEqual('https://github.com/?key=value');
  });
});
