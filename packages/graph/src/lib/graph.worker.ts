import {
  forceSimulation,
  forceLink,
  forceCenter,
  forceRadial,
  forceManyBody,
} from "d3-force"
// @ts-ignore
import { forceManyBodyReuse } from "d3-force-reuse"
import { Link, Node, WithIndex } from "./types"
import { WorkerMessageType } from "./graph-enums"

function updateNodeChildren(
  links: WithIndex<{ source: WithIndex<Node>; target: WithIndex<Node> }>[],
  nodes: WithIndex<Node>[]
) {
  for (const l of links) {
    const parent = nodes[l.target.index]
    const child = nodes[l.source.index]
    if (parent && child) {
      if (!(`children` in parent)) {
        parent.children = []
      }
      if (!(`parents` in child)) {
        child.parents = []
      }
      parent.children!.push({ node: l.source.index, link: l.index })
      child.parents!.push({ node: l.target.index, link: l.index })
    }
  }
}

self.onmessage = (msg) => {
  switch (msg.data.type) {
    case WorkerMessageType.UPDATE_NODE_CHILDREN: {
      const { nodes, links } = msg.data
      updateNodeChildren(links, nodes)
      self.postMessage({
        links,
        nodes,
        type: WorkerMessageType.UPDATE_NODE_CHILDREN,
      })
      self.postMessage({
        type: WorkerMessageType.FINISH_GRAPH,
      })
      break
    }
    case WorkerMessageType.START_GRAPH: {
      const { nodes, links } = msg.data
      const t0 = performance.now()
      const forceLinks = forceLink(links)
        .id(
          (node) =>
            // @ts-ignore
            node.id
        )
        .distance(2000)
      const simulation = forceSimulation(nodes)
        .force(`link`, forceLinks)
        .force(`charge`, forceManyBody().strength(-40_000))
        .force(`center`, forceCenter())
        .force(`dagRadial`, forceRadial(1))
        .stop()
      const LAST_ITERATION = 10
      for (let i = 0; i < LAST_ITERATION; ++i) {
        simulation.tick(5)
        if (i === LAST_ITERATION - 1) {
          updateNodeChildren(links, nodes)
          self.postMessage({
            nodes: nodes,
            type: WorkerMessageType.UPDATE_NODES,
          })
          self.postMessage({
            // links are modified by d3-force and will contain x and y coordinates in source and target
            links,
            type: WorkerMessageType.UPDATE_LINKS,
          })
          self.postMessage({
            type: WorkerMessageType.FINISH_GRAPH,
          })
        } else {
          self.postMessage({
            nodes: simulation.nodes(),
            type: WorkerMessageType.UPDATE_NODES,
          })
        }
      }
      break
    }
  }
}

export default ``
