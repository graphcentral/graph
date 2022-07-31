import { forceSimulation, forceLink, forceCenter, forceRadial } from "d3-force"
// @ts-ignore
import { forceManyBodyReuse } from "d3-force-reuse"
import { WorkerMessageType } from "./graph-enums"

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
        .distance(2000)
      const simulation = forceSimulation(nodes)
        // .force(`charge`, forceCollide().radius(150))
        // .force(`link`, forceLinks)
        // .force(`x`, forceX().strength(-0.1))
        // .force(`y`, forceY().strength(-0.1))
        // .force(`center`, forceCenter())
        .force(`link`, forceLinks)
        .force(`charge`, forceManyBodyReuse().strength(-40_000))
        .force(`center`, forceCenter())
        .force(`dagRadial`, forceRadial(1))
        .stop()
      const LAST_ITERATION = 10
      for (let i = 0; i < LAST_ITERATION; ++i) {
        simulation.tick(2)
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
  }
}

export default ``
