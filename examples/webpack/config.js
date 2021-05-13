const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const ExampleBuilder = require('./example-builder');
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..');

module.exports = {
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
          path.join(__dirname, '..', '..', 'src'),
          path.join(__dirname, '..'),
          path.join(
            __dirname,
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
          loader: path.join(__dirname, 'worker-loader.js'),
        },
        include: [path.join(__dirname, '..', '..', 'src', 'ol', 'worker')],
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
      templates: path.join(__dirname, '..', 'templates'),
      common: 'common',
    }),
    new CopyPlugin({
      patterns: [
        {from: '../src/ol/ol.css', to: 'css'},
        {from: 'data', to: 'data'},
        {from: 'resources', to: 'resources'},
        {from: 'Jugl.js', to: 'Jugl.js'},
        {from: 'index.html', to: 'index.html'},
        {from: 'index.js', to: 'index.js'},
      ],
    }),
  ],
  devtool: 'source-map',
  output: {
    filename: '[name].js',
    path: path.join(__dirname, '..', '..', 'build', 'examples'),
  },
  resolve: {
    fallback: {
      fs: false,
    },
    alias: {
      // allow imports from 'ol/module' instead of specifiying the source path
      ol: path.join(__dirname, '..', '..', 'src', 'ol'),
    },
  },
};
