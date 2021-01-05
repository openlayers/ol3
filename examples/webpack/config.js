import CopyPlugin from 'copy-webpack-plugin';
import ExampleBuilder from './example-builder.js';
import TerserPlugin from 'terser-webpack-plugin';
import fs from 'fs';
import path, {dirname} from 'path';
import {fileURLToPath} from 'url';

const baseDir = dirname(fileURLToPath(import.meta.url));

const src = path.join(baseDir, '..');

export default {
  context: src,
  target: ['web', 'es5'],
  entry: () => {
    const entry = {};
    fs.readdirSync(src)
      .filter((name) => /^(?!index).*\.html$/.test(name))
      .map((name) => name.replace(/\.html$/, ''))
      .forEach((example) => {
        entry[example] = `./${example}.js`;
      });
    return entry;
  },
  stats: 'minimal',
  module: {
    rules: [
      {
        test: /^((?!es2015-)[\s\S])*\.js$/,
        use: {
          loader: 'buble-loader',
          options: {
            transforms: {
              dangerousForOf: true,
            },
          },
        },
        include: [
          path.join(baseDir, '..', '..', 'src'),
          path.join(baseDir, '..'),
          path.join(
            baseDir,
            '..',
            '..',
            'node_modules',
            '@mapbox',
            'mapbox-gl-style-spec'
          ),
        ],
      },
      {
        test: /\.js$/,
        use: {
          loader: path.join(baseDir, 'worker-loader.cjs'),
        },
        include: [path.join(baseDir, '..', '..', 'src', 'ol', 'worker')],
      },
    ],
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        // Do not minify examples that inject code into workers
        exclude: [/(color-manipulation|region-growing|raster)\.js/],
        extractComments: false,
        terserOptions: {
          // Mangle private members convention with underscore suffix
          mangle: {properties: {regex: /_$/}},
        },
      }),
    ],
    runtimeChunk: {
      name: 'common',
    },
    splitChunks: {
      name: 'common',
      chunks: 'initial',
      minChunks: 2,
    },
  },
  plugins: [
    new ExampleBuilder({
      templates: path.join(baseDir, '..', 'templates'),
      common: 'common',
    }),
    new CopyPlugin({
      patterns: [
        {from: '../src/ol/ol.css', to: 'css'},
        {from: 'data', to: 'data'},
        {from: 'resources', to: 'resources'},
        {from: 'index.html', to: 'index.html'},
        {from: 'index.js', to: 'index.js'},
      ],
    }),
  ],
  devtool: 'source-map',
  output: {
    filename: '[name].js',
    path: path.join(baseDir, '..', '..', 'build', 'examples'),
  },
  resolve: {
    fallback: {
      fs: false,
      http: false,
      https: false,
    },
    alias: {
      // allow imports from 'ol/module' instead of specifiying the source path
      ol: path.join(baseDir, '..', '..', 'src', 'ol'),
    },
  },
};
