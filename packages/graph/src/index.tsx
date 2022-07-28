import React from "react"
import ReactDOM from "react-dom"
import { KnowledgeGraph } from "./lib"
import { ExampleImpure } from "./components/Example"
import "./index.css"
import testData from "../../test-data/test11.json"

console.log(testData.nodes[0])
console.log(testData.nodes[10001])
console.log(testData.nodes[10002])

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
