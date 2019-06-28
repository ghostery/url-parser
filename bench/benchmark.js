const Benchmark = require('benchmark');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { URL } = require('../dist/url-parser.cjs.min.js');
const nodeUrl = require('url');

function main() {
  const urls = Array.from(
    new Set(
      fs
        .readFileSync(path.resolve(__dirname, './requests.json'), {
          encoding: 'utf-8',
        })
        .split(/[\n\r]+/g)
        .map(JSON.parse)
        .map(({ url }) => url),
    ),
  );

  function bench(name, args, fn) {
    const suite = new Benchmark.Suite();
    suite
      .add(name, () => fn(args))
      .on('cycle', event => {
        console.log(
          `  + ${name} ${Math.floor(event.target.hz * args.length)} ops/second`,
        );
      })
      .run({ async: false });
  }

  const tests = {
    'url-parser': u => new URL(u),
    'node-url': u => new nodeUrl.URL(u),
  }

  function run() {
    for (const method of Object.keys(tests)) {
      console.log(`= ${chalk.bold(method)}`);
      const fn = tests[method];

      bench(
        `#${chalk.bold('new URL')}(url)`,
        urls,
        urls => {
          for (let i = 0; i < urls.length; i += 1) {
            fn(urls[i]);
          }
        },
      );
      bench(
        `#${chalk.bold('new URL')}(url).search`,
        urls,
        urls => {
          for (let i = 0; i < urls.length; i += 1) {
            fn(urls[i]).search;
          }
        },
      );
      if (method === 'url-parser') {
        bench(
          `#${chalk.bold('new URL')}(url).searchParams.params`,
          urls,
          urls => {
            for (let i = 0; i < urls.length; i += 1) {
              for (const kv of fn(urls[i]).searchParams.params) {}
            }
          },
        );
        bench(
          `#${chalk.bold('new URL')}(url).generalDomain`,
          urls,
          urls => {
            for (let i = 0; i < urls.length; i += 1) {
              for (const kv of fn(urls[i]).generalDomain) {}
            }
          },
        );
      }
      bench(
        `#${chalk.bold('new URL')}(url).searchParams.entries()`,
        urls,
        urls => {
          for (let i = 0; i < urls.length; i += 1) {
            for (const kv of fn(urls[i]).searchParams.entries()) {}
          }
        },
      );
    }
  }

  run()
}

main();
