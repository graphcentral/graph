import React from "react"
import ReactDOM from "react-dom"
import { createNetworkGraph } from "./lib/createNetworkGraph"
import { ExampleImpure } from "./components/Example"
import "./index.css"
import testData from "../../test-data/test9.json"

ReactDOM.render(
  // @ts-ignore
  <ExampleImpure color="#345345" />,
  document.getElementById(`root`),
  async () => {
    console.log(testData)
    createNetworkGraph({
      nodes: testData.nodes,
      links: testData.links,
      canvasElement: document.getElementsByTagName(`canvas`)![0]!,
    })
  }
)
