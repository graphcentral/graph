import webpack from "webpack"
import { workerConfig as originalWorkerConfig } from "./webpack.config.common"
import path from "path"

const optimization: webpack.Configuration['optimization'] = {
  splitChunks: {
    chunks: `all`,
    name: `shared`,
    minSize: 500,
    // minRemainingSize: 0,
    minChunks: 1,
    maxAsyncRequests: 30,
    maxInitialRequests: 30,
    // enforceSizeThreshold: 50000,
    cacheGroups: {
      defaultVendors: {
        test: /[\\/]node_modules[\\/]/,
        priority: -10,
        reuseExistingChunk: true,
      },
      default: {
        minChunks: 2,
        priority: -20,
        reuseExistingChunk: true,
      },
    },
  },
}

export const libConfig: webpack.Configuration = {
  entry: `./src/index.ts`,
  // https://webpack.js.org/plugins/split-chunks-plugin/
  optimization,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: `ts-loader`,
        exclude: /node_modules/,
      },
      {
        test: /\.css?$/,
        use: [`style-loader`, `css-loader`],
      },
      {
        test: /\.fnt$/,
        use: [
          `file-loader`,
          `extract-loader`,
          {
            loader: `html-loader`,
            options: {
              sources: true,
            },
          },
        ],
      },
      // {
      //   test: /\.worker\.ts$/,
      //   type: `asset/source`,
      // },
      // {
      //   test: /\.worker\.ts$/,
      //   loader: `worker-loader`,
      //   options: {
      //     inline: !process.env[`production`] ? `fallback` : `no-fallback`,
      //   },
      // },
    ],
  },
  resolve: {
    extensions: [`.tsx`, `.ts`, `.js`],
  },
  output: {
    chunkFilename: (pathData) => {
      return pathData.chunk?.name === 'main' ? '[name].js' : '[name].[chunkhash].js';
    },
    path: path.resolve(__dirname, `dist`),
    library: {
      name: `@graphcentral/graph`,
      type: `commonjs`
    },
    libraryTarget: `commonjs`,
  },
}

const workerConfig: webpack.Configuration = {
  ...originalWorkerConfig,
  mode: `production`,
  optimization,
  output: {
    filename: `[name].worker.js`,
    chunkFilename: (pathData) => {
      return pathData.chunk?.name === 'main' ? '[name].worker.js' : '[name].[chunkhash].worker.js';
    },
    path: path.resolve(__dirname, `dist`),
  },
}

export default [libConfig, workerConfig]
