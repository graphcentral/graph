import React from "react"
import ReactDOM from "react-dom"
import { KnowledgeGraph } from "./lib/createNetworkGraph"
import { ExampleImpure } from "./components/Example"
import "./index.css"
import testData from "../../test-data/test10.json"

ReactDOM.render(
  // @ts-ignore
  <ExampleImpure color="#345345" />,
  document.getElementById(`root`),
  async () => {
    const knowledgeGraph = new KnowledgeGraph({
      nodes: testData.nodes,
      links: testData.links,
      canvasElement: document.getElementsByTagName(`canvas`)![0]!,
    })
    knowledgeGraph.createNetworkGraph()
  }
)
