import Benchmark from 'benchmark';
import chalk from 'chalk';
import fs from 'node:fs';
import { URL as NodeURL } from 'node:url';
import { ImmutableURL as URL } from '../dist/esm/index.js';

function main() {
  const urls = Array.from(
    new Set(
      fs
        .readFileSync('./requests.json', {
          encoding: 'utf-8',
        })
        .split(/[\n\r]+/g)
        .map<{ url: string }>(JSON.parse as (line: string) => { url: string })
        .map(({ url }) => url),
    ),
  );

  function bench(
    name: string,
    args: string[],
    fn: (urls: string[]) => unknown,
  ) {
    const suite = new Benchmark.Suite();
    suite
      .add(name, () => fn(args))
      .on('cycle', (event: { target: { hz: number } }) => {
        console.log(
          `  + ${name} ${Math.floor(event.target.hz * args.length)} ops/second`,
        );
      })
      .run({ async: false });
  }

  const tests = {
    'url-parser': (u: string) => new URL(u),
    'node-url': (u: string) => new NodeURL(u),
  };

  function run() {
    for (const method in tests) {
      console.log(`= ${chalk.bold(method)}`);
      const fn = tests[method as keyof typeof tests];

      bench(`#${chalk.bold('new URL')}(url)`, urls, (urls) => {
        for (let i = 0; i < urls.length; i += 1) {
          fn(urls[i]);
        }
      });
      bench(`#${chalk.bold('new URL')}(url).search`, urls, (urls) => {
        for (let i = 0; i < urls.length; i += 1) {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          fn(urls[i]).search;
        }
      });
      if (method === 'url-parser') {
        bench(
          `#${chalk.bold('new URL')}(url).searchParams.params`,
          urls,
          (urls) => {
            for (let i = 0; i < urls.length; i += 1) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              for (const _kv of (fn(urls[i]) as URL).searchParams.params) {
                /* empty */
              }
            }
          },
        );
        bench(`#${chalk.bold('new URL')}(url).generalDomain`, urls, (urls) => {
          for (let i = 0; i < urls.length; i += 1) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for (const _kv of (fn(urls[i]) as URL).generalDomain) {
              /* empty */
            }
          }
        });
      }
      bench(
        `#${chalk.bold('new URL')}(url).searchParams.entries()`,
        urls,
        (urls) => {
          for (let i = 0; i < urls.length; i += 1) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for (const _kv of fn(urls[i]).searchParams.entries()) {
              /* empty */
            }
          }
        },
      );
    }
  }

  run();
}

main();
