import React from "react"
import ReactDOM from "react-dom"
import { createNetworkGraph } from "./lib/createNetworkGraph"
import { test10 } from "../../test-data/test10"
import { ExampleImpure } from "./components/Example"
import "./index.css"

const testData = JSON.parse(test10)

ReactDOM.render(
  // @ts-ignore
  <ExampleImpure color="#345345" />,
  document.getElementById(`root`),
  () =>
    createNetworkGraph({
      nodes: testData.nodes,
      links: testData.links,
      canvasElement: document.getElementsByTagName(`canvas`)![0]!,
    })
)
