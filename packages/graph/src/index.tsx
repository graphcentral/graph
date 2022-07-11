import React from "react"
import ReactDOM from "react-dom"
import { createNetworkGraph } from "./lib/createNetworkGraph"
import testData from "../../test-data/test9.json"
import { ExampleImpure } from "./components/Example"
import "./index.css"

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
