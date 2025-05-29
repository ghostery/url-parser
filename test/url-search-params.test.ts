import { expect } from 'chai';
import 'mocha';

import { URLSearchParams as NodeURLSearchParams } from 'url';
import { URLSearchParams } from 'whatwg-url';
import { URLSearchParams as TestURLSearchParams } from '../src/index.js';

type IURLSearchParams =
  | NodeURLSearchParams
  | URLSearchParams
  | TestURLSearchParams;

describe('URLSearchParams', () => {
  function testParamsEquals(
    actual: IURLSearchParams,
    expected: IURLSearchParams,
  ) {
    expect(actual.toString()).to.be.eql(expected.toString());

    const url1Params = expected.entries();
    const url2Params = actual.entries();
    let param1: IteratorResult<[string, string], [string, string]> =
      url1Params.next();
    let param2: IteratorResult<[string, string], [string, string]> =
      url2Params.next();
    while (!param1.done || !param2.done) {
      expect(param2.done).to.be.eql(param1.done);
      expect(param2.value[0]).to.be.eql(param1.value[0]);
      expect(param2.value[1]).to.be.eql(param1.value[1]);
      param1 = url1Params.next();
      param2 = url2Params.next();
    }
  }

  function testURLSearchParams(
    testFn?: (url: IURLSearchParams) => void,
    init?: unknown,
  ) {
    // @ts-expect-error It's expected to fail in case of invalid value.
    const expected = new URLSearchParams(init);
    // @ts-expect-error It's expected to fail in case of invalid value.
    const actual = new TestURLSearchParams(init);
    if (testFn) {
      testFn(actual);
      testFn(expected);
    }
    testParamsEquals(actual, expected);
  }

  describe('#constructor', () => {
    it('no args', () => {
      testURLSearchParams();
    });

    it('with string init value', () => {
      testURLSearchParams(undefined, '?foo=1&bar=2');
    });

    it('with string init value (no preceiding ?)', () => {
      testURLSearchParams(undefined, 'foo=1&bar=2');
    });

    it('with array init value', () => {
      testURLSearchParams(undefined, [
        ['foo', '1'],
        ['bar', 2],
      ]);
    });

    it('with record init value', () => {
      testURLSearchParams(undefined, { foo: 1, bar: 2 });
    });
  });

  describe('#append', () => {
    it('adds a key-value to the end of the params', () => {
      testURLSearchParams((params) => {
        params.append('foo', '4');
      }, 'foo=1&bar=2');
    });
  });

  describe('#delete', () => {
    it('removes a key and associated values', () => {
      testURLSearchParams((params) => {
        params.delete('foo');
      }, '?foo=1&bar=2&foo=3');
    });
  });

  describe('#entries', () => {
    it('iterates key-value pairs', () => {
      // tested in testParamsEquals function
      testURLSearchParams(undefined, 'key1=value1&key2=value2');
    });
  });

  describe('#forEach', () => {
    it('calls callback with each key-value pair', () => {
      testURLSearchParams((params) => {
        const iteratedParams: string[] = [];
        params.forEach((value: string, key: string) => {
          iteratedParams.push(`${key}=${value}`);
        });
        expect(iteratedParams.join('&')).to.be.eql('key1=value1&key2=value2');
      }, 'key1=value1&key2=value2');
    });
  });

  describe('#get', () => {
    it('gets the value for the given key', () => {
      testURLSearchParams((params) => {
        expect(params.get('name')).to.be.eql('Jonathan');
        expect(params.get('age')).to.be.eql('18');
      }, 'name=Jonathan&age=18');
    });
    it('returns null if the parameter does not exist', () => {
      testURLSearchParams((params) => {
        expect(params.get('address')).to.be.null;
      }, 'name=Jonathan&age=18');
    });
    it('returns the first value if the key appears multiple times', () => {
      testURLSearchParams((params) => {
        expect(params.get('name')).to.be.eql('Jonathan');
      }, 'name=Jonathan&name=Sam');
    });
  });

  describe('#getAll', () => {
    it('gets all values for a given key', () => {
      testURLSearchParams((params) => {
        params.append('foo', '4');
        expect(params.getAll('foo')).to.be.eql(['1', '4']);
        expect(params.getAll('bar')).to.be.eql(['2']);
      }, 'foo=1&bar=2');
    });
  });

  describe('#has', () => {
    it('returns true if the parameter exists', () => {
      testURLSearchParams((params) => {
        expect(params.has('bar')).to.be.eql(true);
      }, 'foo=1&bar=2');
    });
    it('returns false if the parameter does not exist', () => {
      testURLSearchParams((params) => {
        expect(params.has('baz')).to.be.eql(false);
      }, 'foo=1&bar=2');
    });
  });

  describe('#keys', () => {
    it('returns all keys', () => {
      testURLSearchParams((params) => {
        expect(Array.from(params.keys())).to.be.eql(['key1', 'key2']);
      }, 'key1=value1&key2=value2');
    });

    it('keys are repeated', () => {
      testURLSearchParams((params) => {
        expect(Array.from(params.keys())).to.be.eql(['key1', 'key2', 'key1']);
      }, 'key1=value1&key2=value2&key1=value2');
    });
  });

  describe('#set', () => {
    it('sets the value for a given search parameter', () => {
      testURLSearchParams((params) => {
        params.set('baz', '3');
        expect(params.get('baz')).to.be.eql('3');
      }, 'foo=1&bar=2');
    });

    it('creates a new parameter if it does not exist', () => {
      testURLSearchParams((params) => {
        params.set('baz', '3');
        expect(params.get('baz')).to.be.eql('3');
      });
    });

    it('deletes other values for the set key', () => {
      testURLSearchParams((params) => {
        params.set('baz', '3');
        expect(params.getAll('baz')).to.be.eql(['3']);
      }, 'baz=1&baz=2&baz=3');
    });
  });

  describe('#sort', () => {
    it('sorts parameters by the key', () => {
      testURLSearchParams((params) => {
        params.sort();
        expect(params.toString()).to.be.eql('a=2&a=1&b=3&c=4');
      }, 'c=4&a=2&b=3&a=1');
    });
  });

  describe('#toString', () => {
    it('returns a URL suitable query string', () => {
      testURLSearchParams((params) => {
        params.append('foo', '4');
        expect(params.toString()).to.be.eql('foo=1&bar=2&foo=4');
      }, 'foo=1&bar=2');
    });

    it('encodes special charaters with url encoding', () => {
      testURLSearchParams((params) => {
        expect(params.toString()).to.be.eql('a=+%2F%23%3F');
      }, 'a= /#?');
    });
  });

  describe('#values', () => {
    it('iterates parameter values', () => {
      testURLSearchParams((params) => {
        expect(Array.from(params.values())).to.be.eql(['value1', 'value2']);
      }, 'key1=value1&key2=value2');
    });
  });
});
