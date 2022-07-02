import { tcAsync } from "src/utilities/essentials"

/**
 *
 * @param echartsInstance
 * @param rootElem
 * @param graphData
 * @returns
 */
async function initEchartsGraph<HTMLElem extends HTMLElement>(
  rootElem: HTMLElem,
  graphData: {
    nodes: any
    links: any
  }
) {
  const [err, allImports] = await tcAsync(
    Promise.all([import(`echarts`), import(`color-hash`)])
  )

  // todo handle error
  if (err || !allImports) return

  const [echarts, { default: ColorHash }] = allImports
  const colorHash = new ColorHash()
  const colorCache: Record<string, string> = {
    undefined: `#aaaaaa`,
  }

  const echartsInstance = echarts.init(rootElem)
  echartsInstance.setOption(
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
          data: graphData.nodes.map((node: any) => {
            return {
              id: node.id,
              name: node.title,
              parentId: node.parentId,
              symbolSize: node.cc ? Math.min(Math.max(10, node.cc), 20) : 10,
            }
          }),
          edges: graphData.links,
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
                colorCache[a.data.parentId] = colorHash.hex(a.data.parentId)
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

  return echartsInstance
}

function resizeCanvasOnWindowResize(
  echartsInstance: Awaited<ReturnType<typeof initEchartsGraph>>
) {
  if (!echartsInstance) return null

  const resizeCanvas = () => {
    if (!echartsInstance) return
    echartsInstance.resize()
  }
  window.addEventListener(`resize`, resizeCanvas)

  return resizeCanvas
}

export async function runEchartsGraph(
  initEchartsGraphParams: Parameters<typeof initEchartsGraph>
) {
  const echartsInstance = await initEchartsGraph(...initEchartsGraphParams)
  const resizeCanvasFn = resizeCanvasOnWindowResize(echartsInstance)

  return {
    echartsInstance,
    resizeCanvasFn,
  }
}
