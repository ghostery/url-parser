import compiler from '@ampproject/rollup-plugin-closure-compiler';
import resolve from 'rollup-plugin-node-resolve';

export default [
  {
    input: './build/es6/url-parser.js',
    output: [
      {
        file: './dist/url-parser.esm.min.js',
        format: 'es',
        sourcemap: true,
      },
      {
        file: './dist/url-parser.cjs.min.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: './dist/url-parser.umd.min.js',
        format: 'umd',
        name: 'url-parser',
        sourcemap: true,
      },
    ],
    plugins: [
      resolve({
        preferBuiltins: false,
      }),
      compiler(),
    ],
  },
];
