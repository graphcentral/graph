import React, { useLayoutEffect, useRef } from "react"
import { FC } from "react"
import { KnowledgeGraph } from "../../lib"
import { enhance } from "../../utilities/essentials"
import { ExampleFallback } from "./fallback"
import testData from "../../../../test-data/test10.json"

// eslint-disable-next-line @typescript-eslint/ban-types
export const Example: FC<{}> = enhance<{}>(() => {
  const canvasElement = useRef<null | HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    ;(async () => {
      if (!canvasElement.current) return
      const knowledgeGraph = new KnowledgeGraph({
        nodes: testData.nodes,
        links: testData.links,
        canvasElement: canvasElement.current,
      })
      knowledgeGraph.createNetworkGraph()
    })()
  }, [])

  return <canvas ref={canvasElement} />
})(ExampleFallback)
