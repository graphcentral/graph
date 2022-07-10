import createLayout from "ngraph.forcelayout"
import createGraph from "ngraph.graph"
import { Node, Link } from "src/lib/createNetworkGraph"

const graph = createGraph<Node, Link>()

// let g = {}

self.onmessage = (msg) => {
  switch (msg.data.type) {
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
        gravity: -12,
        theta: 0.8,
        springLength: 10,
        springCoefficient: 0.8,
        dragCoefficient: 0.9,
      })
      for (let i = 0; i < 1000; ++i) {
        if (i !== 0 && i % 100 === 0) {
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

// proxy({
//   g,
//   layout,
//   graph,
//   setupGraph: (nodes: Node[], links: Link[]) => {
//     g = {
//       nodes,
//       links,
//     }

//   },
//   setupLayout: () => {

//   },
// })

export default ``
