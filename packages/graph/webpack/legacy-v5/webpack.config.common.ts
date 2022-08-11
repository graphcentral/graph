import path from "path"
import webpack from "webpack"
import HtmlWebpackPlugin from "html-webpack-plugin"
// @ts-ignore
import PreloadWebpackPlugin from "@vue/preload-webpack-plugin"

// const optimization: webpack.Configuration[`optimization`] = {
//   runtimeChunk: `multiple`,
//   splitChunks: {
//     chunks: `all`,
//     name: "shared",
//     cacheGroups: {
//       vendor: {
//         test: /[\\/]node_modules[\\/]/,
//         //@ts-ignore
//         name(module) {
//           // get the name. E.g. node_modules/packageName/not/this/part.js
//           // or node_modules/packageName
//           const packageName = module.context.match(
//             /[\\/]node_modules[\\/](.*?)([\\/]|$)/
//           )[1]

//           // npm package names are URL-safe, but some servers don't like @ symbols
//           return `npm.${packageName.replace(`@`, ``)}`
//         },
//       },
//     },
//   },
// }

const createWorkerConfig: (workerPath: string) => webpack.Configuration = (
  workerPath
) => ({
  entry: workerPath,
  output: {
    filename: `[name].worker.js`,
    path: path.resolve(__dirname, `dist`),
    publicPath: `dist/`,
    globalObject: `this`,
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
})

export const workerConfigs = [`./src/lib/graph.worker.ts`].map(
  createWorkerConfig
)

export const commonConfig: webpack.Configuration = {
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
        test: /\.tsx?$/,
        use: `ts-loader`,
        exclude: /node_modules/,
      },
      {
        test: /\.css?$/,
        use: [`style-loader`, `css-loader`],
      },
      {
        test: /\.(fnt)$/i,
        type: `asset/resource`,
        generator: {
          filename: `static/[name].fnt`,
        },
      },
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
    new PreloadWebpackPlugin({}),
  ],
}
