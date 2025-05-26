import terser from '@rollup/plugin-terser';

export default {
  input: './dist/esm/index.js',
  output: {
    file: './dist/url-parser.umd.min.js',
    format: 'umd',
    name: 'url-parser',
    sourcemap: true,
  },
  plugins: [
    terser({
      output: {
        comments: false,
      },
    }),
  ],
};
