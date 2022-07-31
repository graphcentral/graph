import { KnowledgeGraph } from "./"
import testData from "../../../test-data/test15.json"

self.addEventListener(
  `message`,
  (message: MessageEvent<{ canvas: HTMLCanvasElement }>) => {
    const knowledgeGraph = new KnowledgeGraph({
      nodes: testData.nodes,
      links: testData.links,
      canvasElement: message.data.canvas as HTMLCanvasElement,
    })
    knowledgeGraph.createNetworkGraph()
  }
)
