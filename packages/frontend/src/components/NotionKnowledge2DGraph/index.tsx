import React, { useEffect, useRef } from "react"
import { FC } from "react"
import { NotionKnowledge2DGraphFallback } from "./fallback"
import { enhance, tcAsync } from "../../utilities/essentials"
import testData from "../../../../test-data/test4.json"

// eslint-disable-next-line @typescript-eslint/ban-types
export type NotionKnowledgeGrap2DImpureProps = {}

export const NotionKnowledg2DGraphImpure: FC<NotionKnowledgeGrap2DImpureProps> =
  enhance<NotionKnowledgeGrap2DImpureProps>(() => {
    const rootElem = useRef<HTMLDivElement | null>(null)
    const cyRef = useRef<Awaited<
      // eslint-disable-next-line quotes
      typeof import("cytoscape")
    > | null>(null)

    useEffect(() => {
      async function loadModule() {
        const [err, cy] = await tcAsync(import(`cytoscape`))

        if (err || !cy || !rootElem.current) return

        cyRef.current = cy.default

        cyRef.current({
          container: rootElem.current,

          elements: {
            nodes: testData.nodes.map((n) => ({
              data: n,
            })),
            edges: testData.links.map((l) => ({
              data: l,
            })),
          },

          style: [
            // the stylesheet for the graph
            {
              selector: `node`,
              style: {
                "background-color": `#666`,
                label: `data(title)`,
              },
            },

            {
              selector: `edge`,
              style: {
                width: 3,
                "line-color": `#ccc`,
                "target-arrow-color": `#ccc`,
                "target-arrow-shape": `triangle`,
                "curve-style": `bezier`,
              },
            },

            // {
            //   selector: `la`
            // }
          ],

          // layout: {
          //   name: `grid`,
          //   rows: 1,
          // },
        })
      }
      loadModule()
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
