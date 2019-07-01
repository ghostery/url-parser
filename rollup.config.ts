import compiler from '@ampproject/rollup-plugin-closure-compiler';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';

const plugins = [
  resolve({
    preferBuiltins: false,
  }),
  commonjs(),
];

const bundleName = 'url-parser';

export default [
  {
    input: `./build/${bundleName}.js`,
    output: {
      file: `./dist/${bundleName}.umd.js`,
      format: 'umd',
      name: 'tldts',
    },
    plugins,
  },
  // UMD minified
  {
    input: `./build/${bundleName}.js`,
    output: {
      file: `./dist/${bundleName}.umd.min.js`,
      format: 'umd',
      name: 'tldts',
    },
    plugins: [...plugins, compiler()],
  },
  // CommonJS + ES6
  {
    external: ['tldts'],
    input: `./build/${bundleName}.js`,
    output: [
      { file: `./dist/${bundleName}.esm.js`, format: 'es' },
      { file: `./dist/${bundleName}.cjs.js`, format: 'cjs' },
    ],
    plugins,
  },
  // ES6 minified
  {
    input: `./build/${bundleName}.js`,
    output: {
      file: `./dist/${bundleName}.esm.min.js`,
      format: 'es',
    },
    plugins: [...plugins, compiler()],
  },
  // CommonJS minified
  {
    input: `./dist/${bundleName}.esm.min.js`,
    output: {
      file: `./dist/${bundleName}.cjs.min.js`,
      format: 'cjs',
    },
    plugins,
  },
];
