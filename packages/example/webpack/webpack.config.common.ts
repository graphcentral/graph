import path from "path"
import webpack from "webpack"
import HtmlWebpackPlugin from "html-webpack-plugin"

const optimization: webpack.Configuration[`optimization`] = {
  runtimeChunk: `multiple`,
  splitChunks: {
    chunks: `all`,
    name: `shared`,
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        //@ts-ignore
        name(module) {
          // get the name. E.g. node_modules/packageName/not/this/part.js
          // or node_modules/packageName
          const packageName = module.context.match(
            /[\\/]node_modules[\\/](.*?)([\\/]|$)/
          )[1]

          // npm package names are URL-safe, but some servers don't like @ symbols
          return `npm.${packageName.replace(`@`, ``)}`
        },
      },
    },
  },
}

export const commonConfig: webpack.Configuration = {
  entry: `./src/index.tsx`,
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
  },
  output: {
    filename: `[chunkhash].[name].js`,
    path: path.resolve(__dirname, `..`, `dist`),
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    new HtmlWebpackPlugin({
      template: path.join(__dirname, `..`, `public`, `index.html`),
    }),
  ],
}
