import React, { useEffect, useRef } from "react"
import { FC } from "react"
import { NotionKnowledge2DGraphFallback } from "./fallback"
import { enhance, tcAsync } from "../../utilities/essentials"
import testData from "../../../../test-data/test2.json"

// eslint-disable-next-line @typescript-eslint/ban-types
export type NotionKnowledgeGrap2DImpureProps = {}

export const NotionKnowledg2DGraphImpure: FC<NotionKnowledgeGrap2DImpureProps> =
  enhance<NotionKnowledgeGrap2DImpureProps>(() => {
    const rootElem = useRef<HTMLDivElement | null>(null)
    const ecRef = useRef<echarts.ECharts | null>(null)
    const resizeCanvasFn = useRef<VoidFunction | null>(null)

    useEffect(() => {
      async function loadModule() {
        const [err, allImports] = await tcAsync(
          Promise.all([import(`echarts`), import(`color-hash`)])
        )

        // todo handle error
        if (err || !allImports || !rootElem.current) return

        const [echarts, { default: ColorHash }] = allImports
        const colorHash = new ColorHash()
        ecRef.current = echarts.init(rootElem.current)

        const colorCache: Record<string, string> = {
          undefined: `#aaaaaa`,
        }

        ecRef.current.setOption(
          {
            title: {
              text: `Notion Knowledge Graph`,
            },
            backgroundColor: `#131313`,
            series: [
              {
                type: `graph`,
                layout: `force`,
                // progressiveThreshold: 700,
                data: testData.nodes.map((node) => {
                  return {
                    id: node.id,
                    name: node.title,
                    parentId: node.parentId,
                    symbolSize: node.cc
                      ? Math.min(Math.max(10, node.cc), 20)
                      : 10,
                  }
                }),
                edges: testData.links,
                emphasis: {
                  focus: `adjacency`,
                  label: {
                    position: `right`,
                    show: true,
                  },
                  lineStyle: {
                    width: 3,
                  },
                },
                roam: true,
                lineStyle: {
                  width: 0.5,
                  curveness: 0.3,
                  opacity: 0.7,
                },
                itemStyle: {
                  color: (a: any) => {
                    if (!a.data.parentId) return colorCache[`undefined`]
                    if (!(a.data.parentId in colorCache)) {
                      colorCache[a.data.parentId] = colorHash.hex(
                        a.data.parentId
                      )
                    }
                    return colorCache[a.data.parentId]
                  },
                },
                force: {
                  edgeLength: 15,
                  friction: 0.1,
                  repulsion: 100,
                  gravity: 0,
                  draggable: true,
                },
              },
            ],
          },
          true
        )

        ecRef.current.on(`click`, (params) => {
          console.log(params)
        })

        // ecRef.current.dispatchAction({})

        return ecRef.current
      }
      function resizeCanvasOnWindowResize(
        echartsInstance: Awaited<ReturnType<typeof loadModule>>
      ) {
        if (!echartsInstance || !rootElem.current) return null

        const resizeCanvas = () => {
          if (!echartsInstance) return
          echartsInstance.resize()
        }
        window.addEventListener(`resize`, resizeCanvas)

        return resizeCanvas
      }
      async function run() {
        const echartsInstance = await loadModule()
        resizeCanvasFn.current = resizeCanvasOnWindowResize(echartsInstance)
      }
      run()

      return () => {
        if (resizeCanvasFn.current)
          window.removeEventListener(`resize`, resizeCanvasFn.current)
      }
    }, [])

    return (
      <NotionKnowledgeGrap2DPure rootElem={rootElem}>
        2
      </NotionKnowledgeGrap2DPure>
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
