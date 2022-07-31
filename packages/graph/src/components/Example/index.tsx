import React, { useLayoutEffect, useRef } from "react"
import { FC } from "react"
import { KnowledgeGraph } from "../../lib"
import { enhance } from "../../utilities/essentials"
import { ExampleFallback } from "./fallback"
import testData from "../../../../test-data/test15.json"

// eslint-disable-next-line @typescript-eslint/ban-types
export const Example: FC<{}> = enhance<{}>(() => {
  const canvasElement = useRef<null | HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    ;(async () => {
      if (!canvasElement.current) return

      const canvas = canvasElement.current
      canvas.id = `gameplay-canvas`
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      canvas.style.width = `100%`
      canvas.style.height = `100%`
      document.body.appendChild(canvas)

      const offscreen = canvas.transferControlToOffscreen()

      const pixiWorker = new Worker(
        new URL(`../../lib/offscreencanvas.worker.ts`, import.meta.url)
      )

      pixiWorker.postMessage(
        {
          canvas: offscreen,
          width: window.innerWidth,
          height: window.innerHeight,
        },
        [offscreen]
      )
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
