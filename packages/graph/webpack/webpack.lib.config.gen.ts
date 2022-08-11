import webpack from "webpack"
import tsconfigRaw from "../tsconfig.lib.json"
import BundleAnalyzerPlugin from "webpack-bundle-analyzer"

function genLibConfig(isDevelopment: boolean): webpack.Configuration {
  return {
    entry: {
      main: `./src/index.ts`,
    },
    stats: {
      children: true,
      optimizationBailout: true,
    },
    optimization: {
      usedExports: true,
    },
    mode: isDevelopment ? `development` : `production`,
    devtool: isDevelopment ? `source-map` : undefined,
    module: {
      rules: [
        // Place this *before* the `ts-loader`.
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
          loader: `esbuild-loader`,
          options: {
            loader: `tsx`,
            target: `es2015`,
            tsconfigRaw,
          },
        },
      ],
    },
    resolve: {
      extensions: [`.tsx`, `.ts`, `.js`],
      alias: {
        process: `process/browser`,
      },
    },
    output: {
      filename: (pathData) => {
        return pathData.chunk?.name === `main`
          ? `[name].js`
          : `[contenthash].[name].js`
      },
      publicPath: `/assets/`,
      libraryTarget: `commonjs2`,
      globalObject: `this`,
      asyncChunks: true,
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: `process/browser`,
      }),
      ...(!isDevelopment
        ? [new BundleAnalyzerPlugin.BundleAnalyzerPlugin()]
        : []),
    ],
  }
}

export default genLibConfig
