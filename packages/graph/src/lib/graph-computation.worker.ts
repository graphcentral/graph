import { MovedEventData } from "pixi-viewport"
import { Rectangle } from "pixi.js"
import { isNodeInsideBonds } from "./common-graph-util"
import { Link, Node, WithCoords } from "."
import { WorkerMessageType } from "./graphEnums"

let links: Link[]
let nodes: WithCoords<Node>[]

self.onmessage = (msg) => {
  switch (msg.data.type) {
    case WorkerMessageType.INIT_GRAPH_COMPUTATION_WORKER: {
      links = msg.data.links
      nodes = msg.data.nodes
      break
    }
    case WorkerMessageType.FIND_NODES_INSIDE_BOUND: {
      console.log(links)
      console.log(nodes)

      const nodesInsideBound: WithCoords<Node>[] = []
      console.log(msg.data.bounds)
      for (const node of nodes) {
        const cc = node.cc ?? 0
        if (msg.data.minimumRenderCC > cc) {
          continue
        }

        if (isNodeInsideBonds(node, msg.data.bounds)) {
          nodesInsideBound.push(node)
        }
      }

      self.postMessage({
        type: WorkerMessageType.FIND_NODES_INSIDE_BOUND,
        nodes: nodesInsideBound,
      })
      break
    }
  }
}

export default ``
