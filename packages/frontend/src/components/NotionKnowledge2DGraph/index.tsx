import React, { useEffect, useRef } from "react"
import { FC } from "react"
import { NotionKnowledge2DGraphFallback } from "./fallback"
import { enhance, tcAsync } from "../../utilities/essentials"
import testData from "../../../../test-data/test2.json"
import { runEchartsGraph } from "src/echarts/core"

// eslint-disable-next-line @typescript-eslint/ban-types
export type NotionKnowledgeGrap2DImpureProps = {}

export const NotionKnowledg2DGraphImpure: FC<NotionKnowledgeGrap2DImpureProps> =
  enhance<NotionKnowledgeGrap2DImpureProps>(() => {
    const rootElem = useRef<HTMLDivElement | null>(null)
    const ecRef = useRef<echarts.ECharts | null>(null)
    const resizeCanvasFnRef = useRef<VoidFunction | null>(null)

    useEffect(() => {
      async function initNKG() {
        if (!rootElem.current) return
        const { echartsInstance, resizeCanvasFn } = await runEchartsGraph([
          rootElem.current,
          testData,
        ])

        resizeCanvasFnRef.current = resizeCanvasFn
        ecRef.current = echartsInstance ?? null
      }

      initNKG()

      return () => {
        if (resizeCanvasFnRef.current)
          window.removeEventListener(`resize`, resizeCanvasFnRef.current)
      }
    }, [])

    return (
      <NotionKnowledgeGrap2DPure
        rootElem={rootElem}
      ></NotionKnowledgeGrap2DPure>
    )
  })(NotionKnowledge2DGraphFallback)

// eslint-disable-next-line @typescript-eslint/ban-types
export type NotionKnowledgeGraphPure2Drops = {
  rootElem: React.MutableRefObject<HTMLDivElement | null>
}

export const NotionKnowledgeGrap2DPure: FC<NotionKnowledgeGraphPure2Drops> =
  enhance<NotionKnowledgeGraphPure2Drops>(({ rootElem }) => {
    return (
      <div
        style={{
          width: `100%`,
          height: `100%`,
        }}
        ref={rootElem}
      ></div>
    )
  })(NotionKnowledge2DGraphFallback)
