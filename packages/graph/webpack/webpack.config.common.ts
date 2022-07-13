import path from "path"
import webpack from "webpack"
import HtmlWebpackPlugin from "html-webpack-plugin"

export const workerConfig: webpack.Configuration = {
  entry: `./src/lib/graph.worker.ts`,
  output: {
    filename: `[name].worker.js`,
    path: path.resolve(__dirname, `dist`),
    publicPath: `dist/`,
  },
  target: `webworker`,
  devtool: `source-map`,
  mode: `development`,
  resolve: {
    modules: [`src`, `node_modules`],
    extensions: [`.js`, `.ts`, `.tsx`],
    plugins: [],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: `ts-loader`,
        options: {
          transpileOnly: true,
        },
        // exclude: /node_modules/,
      },
    ],
  },
}

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
    // roots: [path.resolve(`.`)],
    // alias: {
    //   src: path.resolve(__dirname, `.`),
    // },
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
}
