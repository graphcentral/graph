import { MovedEventData } from "pixi-viewport"
import { Rectangle } from "pixi.js"
import { isNodeInsideBonds } from "./common-graph-util"
import { Link, Node, WithCoords } from "./types"
import { WorkerMessageType } from "./graph-enums"

let links: Link[]
let nodes: WithCoords<Node>[]

self.onmessage = (msg) => {
  switch (msg.data.type) {
    case WorkerMessageType.INIT_GRAPH_COMPUTATION_WORKER: {
      links = msg.data.links
      nodes = msg.data.nodes
      break
    }
    case WorkerMessageType.UPDATE_VISIBLE_NODES: {
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
        type: WorkerMessageType.UPDATE_VISIBLE_NODES,
        nodes: nodesInsideBound,
      })
      break
    }
  }
}

export default ``
