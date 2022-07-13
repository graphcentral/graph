import createLayout from "ngraph.forcelayout"
import createGraph from "ngraph.graph"
import { Node, Link } from "./createNetworkGraph"
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceX,
  forceY,
  forceCollide,
} from "d3-force"
import { WorkerMessageType } from "./graphEnums"

// console.log(d3Wasm)

const graph = createGraph<Node, Link>()

self.onmessage = (msg) => {
  switch (msg.data.type) {
    case WorkerMessageType.START_GRAPH: {
      const { nodes, links } = msg.data
      // const simulation =
      console.log(`simulation started`)
      const t0 = performance.now()
      const forceLinks = forceLink(links)
        .id(
          (node) =>
            // @ts-ignore
            node.id
        )
        .distance(50)
      const simulation = forceSimulation(nodes)
        .force(`charge`, forceCollide().radius(300))
        .force(`link`, forceLinks)
        .force(`x`, forceX().strength(-0.06))
        .force(`y`, forceY().strength(-0.06))
        .force(`center`, forceCenter())
        .stop()
      const LAST_ITERATION = 10
      for (let i = 0; i < LAST_ITERATION; ++i) {
        simulation.tick(3)
        self.postMessage({
          nodes: simulation.nodes(),
          type: WorkerMessageType.UPDATE_NODES,
        })
        if (i === LAST_ITERATION - 1) {
          self.postMessage({
            // links are modified by d3-force and will contain x and y coordinates in source and target
            links,
            type: WorkerMessageType.UPDATE_LINKS,
          })
        }
      }
      const t1 = performance.now()
      console.log(`simulation ended. took: ${t1 - t0}ms`)
      // simulation.nodes
      console.log(links)
      break
    }
    case `legacy_start_process`: {
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
