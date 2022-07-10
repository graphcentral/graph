import createLayout from "ngraph.forcelayout"
import createGraph from "ngraph.graph"
import { Node, Link } from "src/lib/createNetworkGraph"
import { proxy } from "web-worker-proxy"

const graph = createGraph<Node, Link>()
const layout = createLayout(graph, {
  timeStep: 0.5,
  dimensions: 2,
  gravity: -12,
  theta: 0.8,
  springLength: 10,
  springCoefficient: 0.8,
  dragCoefficient: 0.9,
})

proxy({
  setupGraph: (nodes: Node[], links: Link[]) => {
    for (const node of nodes) {
      graph.addNode(node.id, node)
    }
    for (const link of links) {
      graph.addLink(link.source, link.target, link)
    }
  },
  layout,
  setupLayout: () => {
    for (let i = 0; i < 500; ++i) {
      layout.step()
    }
  },
})

export default ``
