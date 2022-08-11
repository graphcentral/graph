import path from "path"
import webpack from "webpack"
// @ts-ignore
import HtmlWebpackPlugin from "html-webpack-plugin"
// https://github.com/DefinitelyTyped/DefinitelyTyped/issues/27570#issuecomment-437115227
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as webpackDevServer from "webpack-dev-server"

const config: webpack.Configuration = {
  entry: `./src/index.tsx`,
  // https://webpack.js.org/plugins/split-chunks-plugin/
  optimization: {
    // https://stackoverflow.com/questions/58073626/uncaught-typeerror-cannot-read-property-call-of-undefined-at-webpack-requir
    sideEffects: false, // <----- in prod defaults to true if left blank
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
        test: /\.worker\.ts$/,
        loader: `worker-loader`,
        options: {
          // no-fallback in prod
          inline: `fallback`,
        },
      },
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
  ],
  mode: `development`,
  devtool: `inline-source-map`,
  devServer: {
    static: path.join(__dirname, `dist`),
    // publicPath: path.resolve(`static`),
    compress: true,
    port: 8080,
    open: true,
  },
}

export default config
