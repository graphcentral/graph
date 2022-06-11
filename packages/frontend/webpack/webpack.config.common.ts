import path from "path"
import webpack, { DefinePlugin } from "webpack"
import HtmlWebpackPlugin from "html-webpack-plugin"
import dotenv from "dotenv"

import fs from "fs"

export const commonConfig: webpack.Configuration = {
  entry: `./src/index.tsx`,
  // https://webpack.js.org/plugins/split-chunks-plugin/
  optimization: {
    splitChunks: {
      chunks: `all`,
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
  },
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
    ],
  },
  resolve: {
    extensions: [`.tsx`, `.ts`, `.js`],
    // for absolute path resolution: https://stackoverflow.com/questions/55180192/webpack-does-not-see-the-absolute-path
    alias: {
      root: __dirname,
      src: path.resolve(__dirname, `..`, `src`),
    },
  },
  output: {
    filename: `[chunkhash].[name].js`,
    path: path.resolve(__dirname, `dist`),
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    new HtmlWebpackPlugin({
      template: path.join(__dirname, `..`, `public`, `index.html`),
    }),
    new DefinePlugin({
      "process.env": JSON.stringify(
        dotenv.config({
          path: path.resolve(__dirname, `..`, `..`, `..`, `.env`),
        }).parsed
      ),
    }),
  ],
}
