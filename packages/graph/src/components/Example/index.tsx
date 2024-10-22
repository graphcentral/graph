import React, { useLayoutEffect, useRef } from "react"
import { FC } from "react"
import { KnowledgeGraph } from "../../lib"
import { enhance } from "../../utilities/essentials"
import { ExampleFallback } from "./fallback"
// import testData from "../../../../test-data/test11.json"

// eslint-disable-next-line @typescript-eslint/ban-types
export const Example: FC<{}> = enhance<{}>(() => {
  const canvasElement = useRef<null | HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    ;(async () => {
      if (!canvasElement.current) return
      const testData = await fetch(
        // `https://raw.githubusercontent.com/9oelM/datastore/main/prelayout-true-nodes-100000-links-118749.json`
        // `https://raw.githubusercontent.com/9oelM/datastore/main/3000ish.json`
        // `https://raw.githubusercontent.com/9oelM/datastore/main/notion-help-docs.json`
        // `https://raw.githubusercontent.com/9oelM/datastore/main/prelayout-true-nodes-5100-links-6249.json`
        `https://raw.githubusercontent.com/9oelM/datastore/main/prelayout-true-notion-help-docs.json`
      ).then((resp) => resp.json())

      const knowledgeGraph = new KnowledgeGraph({
        // @ts-ignore
        nodes: testData.nodes,
        // @ts-ignore
        links: testData.links,
        canvasElement: canvasElement.current,
        options: {
          optimization: {
            useParticleContainer: true,
            useShadowContainer: true,
            showEdgesOnCloseZoomOnly: true,
            useMouseHoverEffect: true,
            maxTargetFPS: 60,
          },
          graph: {
            runForceLayout: false,
            customFont: {
              url: `https://fonts.googleapis.com/css2?family=Do+Hyeon&display=swap`,
              config: {
                fill: 0xffffff,
                fontFamily: `Do Hyeon`,
              },
            },
          },
        },
      })
      knowledgeGraph.createNetworkGraph()
    })()
  }, [])

  return <canvas ref={canvasElement} />
})(ExampleFallback)
