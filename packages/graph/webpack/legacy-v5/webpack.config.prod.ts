import webpack from "webpack"
import { commonConfig, workerConfigs } from "./webpack.config.common"

const config: webpack.Configuration = {
  mode: `production`,
  ...commonConfig,
}

export default [config, ...workerConfigs]
