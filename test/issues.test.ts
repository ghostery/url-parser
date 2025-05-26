import { expect } from 'chai';
import 'mocha';

import { URL } from '../src/index.js';

describe('Github', () => {
  it('Issue 22: Unable to set querystring', () => {
    const url = new URL('https://github.com');
    url.searchParams.set('key', 'value');
    expect(url.href).to.be.eql('https://github.com/?key=value');
  });
});
