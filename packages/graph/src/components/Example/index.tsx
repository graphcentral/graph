import React, { useLayoutEffect, useRef } from "react"
import { FC } from "react"
import { KnowledgeGraph } from "../../lib"
import { enhance } from "../../utilities/essentials"
import { ExampleFallback } from "./fallback"
import testData from "../../../../test-data/test11.json"

// eslint-disable-next-line @typescript-eslint/ban-types
export const Example: FC<{}> = enhance<{}>(() => {
  const canvasElement = useRef<null | HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    ;(async () => {
      if (!canvasElement.current) return
      const knowledgeGraph = new KnowledgeGraph({
        // @ts-ignore
        nodes: testData.nodes,
        // @ts-ignore
        links: testData.links,
        canvasElement: canvasElement.current,
        options: {
          optimization: {
            useParticleContainer: false,
            useShadowContainer: false,
            showEdgesOnCloseZoomOnly: true,
            useMouseHoverEffect: true,
            maxTargetFPS: 60,
          },
          graph: {
            runForceLayout: true,
          },
        },
      })
      knowledgeGraph.createNetworkGraph()
    })()
  }, [])

  return <canvas ref={canvasElement} />
})(ExampleFallback)
