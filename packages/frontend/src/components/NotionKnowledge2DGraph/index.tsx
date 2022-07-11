import React, { useEffect, useRef } from "react"
import { FC } from "react"
import { NotionKnowledge2DGraphFallback } from "./fallback"
import { enhance, tcAsync } from "../../utilities/essentials"
import testData from "../../../../test-data/test6.json"
import { runEchartsGraph } from "src/echarts/core"
import { GraphCanvas } from "reagraph"

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
      <GraphCanvas
        // nodes={[
        //   {
        //     id: `1`,
        //     label: `1`,
        //   },
        //   {
        //     id: `2`,
        //     label: `2`,
        //   },
        // ]}
        // edges={[
        //   {
        //     id: `1->2`,
        //     source: `n-1`,
        //     target: `n-2`,
        //     label: `Edge 1-2`,
        //   },
        // ]}
        nodes={testData.nodes}
        edges={testData.links.map((all, i) => ({
          ...all,
          id: String(i),
        }))}
      ></GraphCanvas>
    )
  })(NotionKnowledge2DGraphFallback)

// eslint-disable-next-line @typescript-eslint/ban-types
// export type NotionKnowledgeGraphPure2Drops = {
//   rootElem: React.MutableRefObject<HTMLDivElement | null>
// }

// export const NotionKnowledgeGrap2DPure: FC<NotionKnowledgeGraphPure2Drops> =
//   enhance<NotionKnowledgeGraphPure2Drops>(({ rootElem }) => {
//     return (
//       <div
//         style={{
//           width: `100%`,
//           height: `100%`,
//         }}
//         ref={rootElem}
//       ></div>
//     )
//   })(NotionKnowledge2DGraphFallback)
