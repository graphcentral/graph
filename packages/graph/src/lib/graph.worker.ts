import createLayout from "ngraph.forcelayout"
import createGraph from "ngraph.graph"
import { Node, Link } from "src/lib/createNetworkGraph"
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
} from "d3-force"

const graph = createGraph<Node, Link>()

self.onmessage = (msg) => {
  switch (msg.data.type) {
    case `d3_start_process`: {
      const { nodes, links } = msg.data
      // const simulation =
      console.log(`simulation started`)
      const t0 = performance.now()
      const simulation = forceSimulation(nodes)
        .force(`charge`, forceManyBody())
        .force(`link`, forceLink(links))
        .force(`center`, forceCenter())
        .stop()
      // forceSimulation(nodes)
      //   .force(`charge`, forceManyBody())
      //   .force(`center`, forceCenter())
      //   .force(`dagRadial`, null)
      //   .force(`link`, forceLink(links))
      for (let i = 0; i < 1000; ++i) {
        simulation.tick(1)
        if (i !== 0 && i % 2 === 0) {
          self.postMessage({
            nodePositions: simulation.nodes(),
            type: `d3_update_process`,
          })
        }
      }
      const t1 = performance.now()
      console.log(`simulation ended. took: ${t1 - t0}ms`)
      // simulation.nodes
      console.log(simulation.nodes)
      break
    }
    case `start_process`: {
      const { nodes, links } = msg.data
      self.postMessage({ nodes, links })
      for (const node of nodes) {
        graph.addNode(node.id, node)
      }
      for (const link of links) {
        graph.addLink(link.source, link.target, link)
      }
      const layout = createLayout(graph, {
        timeStep: 0.5,
        dimensions: 2,
        gravity: -30,
        theta: 0.8,
        springLength: 10,
        springCoefficient: 0.8,
        dragCoefficient: 0.4,
      })
      for (let i = 0; i < 1000; ++i) {
        if (i !== 0 && i % 50 === 0) {
          const nodePositions: Array<
            ReturnType<typeof layout[`getNodePosition`]>
          > = []
          graph.forEachNode((node) => {
            nodePositions.push(layout.getNodePosition(node.id))
          })
          const linkPositions: Array<
            ReturnType<typeof layout[`getLinkPosition`]>
          > = []
          graph.forEachLink((link) => {
            linkPositions.push(layout.getLinkPosition(link.id))
          })
          self.postMessage({
            nodePositions,
            linkPositions,
            type: `update_process`,
          })
        }
        layout.step()
      }
    }
  }
}

export default ``
