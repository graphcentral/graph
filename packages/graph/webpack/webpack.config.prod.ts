import webpack from "webpack"
import { commonConfig, workerConfig } from "./webpack.config.common"

const config: webpack.Configuration = {
  mode: `production`,
  ...commonConfig,
}

export default [config, workerConfig]
