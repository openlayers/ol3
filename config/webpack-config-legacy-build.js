import TerserPlugin from 'terser-webpack-plugin';
import path, {dirname} from 'path';
import {fileURLToPath} from 'url';

const baseDir = dirname(fileURLToPath(import.meta.url));

export default {
  entry: './build/index.js',
  devtool: 'source-map',
  mode: 'production',
  target: ['web', 'es5'],
  module: {
    rules: [
      {
        test: /^((?!es2015-)[\s\S])*\.js$/,
        use: {
          loader: 'buble-loader',
          options: {
            transforms: {dangerousForOf: true},
          },
        },
        include: [
          path.join(
            baseDir,
            '..',
            'node_modules',
            '@mapbox',
            'mapbox-gl-style-spec'
          ),
        ],
      },
    ],
  },
  resolve: {
    fallback: {
      fs: false,
      http: false,
      https: false,
    },
    alias: {
      ol: path.resolve('./build/ol'),
    },
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          // Mangle private members convention with underscore suffix
          mangle: {properties: {regex: /_$/}},
        },
      }),
    ],
  },
  output: {
    path: path.resolve('./build/legacy'),
    filename: 'ol.js',
    library: 'ol',
    libraryTarget: 'umd',
    libraryExport: 'default',
  },
};
