import React, { useEffect, useRef } from "react"
import { FC } from "react"
import { NotionKnowledge2DGraphFallback } from "./fallback"
import { enhance, tcAsync } from "../../utilities/essentials"
import testData from "../../../../test-data/test4.json"
import debounce from "lodash.debounce"
import { EventObject } from "cytoscape"

// eslint-disable-next-line @typescript-eslint/ban-types
export type NotionKnowledgeGrap2DImpureProps = {}

export const NotionKnowledg2DGraphImpure: FC<NotionKnowledgeGrap2DImpureProps> =
  enhance<NotionKnowledgeGrap2DImpureProps>(() => {
    const rootElem = useRef<HTMLDivElement | null>(null)
    const cyRef = useRef<{
      default: typeof cytoscape
      use(module: cytoscape.Ext): void
      warnings(condition: boolean): void
    } | null>(null)

    useEffect(() => {
      async function loadModule() {
        const [err, allImports] = await tcAsync(
          Promise.all([
            import(`cytoscape`),
            import(`cytoscape-popper`),
            // @ts-ignore
            import(`cytoscape-fcose`),
            // @ts-ignore
            import(`cytoscape-elk`),
          ])
        )

        if (err || !allImports || !rootElem.current) return

        const [cytoscapeCoreImports, { default: cyPopperDefault }, fcose, elk] =
          allImports

        cytoscapeCoreImports.use(fcose.default)
        cytoscapeCoreImports.use(elk.default)

        cyRef.current = cytoscapeCoreImports
        // cytoscapeCoreImports.use(cise.default)

        const cy = cytoscapeCoreImports.default({
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
            {
              selector: `node.highlight`,
              style: {
                "border-color": `#FFF`,
                "border-width": `2px`,
              },
            },
            {
              selector: `node.semitransp`,
              // @ts-ignore
              style: { opacity: `0.1` },
            },
            {
              selector: `edge.highlight`,
              style: { "mid-target-arrow-color": `#FFF` },
            },
            {
              selector: `edge.semitransp`,
              // @ts-ignore
              style: { opacity: `0.1` },
            },

            // {
            //   selector: `la`
            // }
          ],

          layout: {
            // @ts-ignore
            name: `elk`,
            // nodeSeparation: 1000000,
            // @ts-ignore
            // nodeRepulsion: () => 10_000,
            // nodeSeparation: 10000,
            // clusters: (node) => node.id,
            // nodeOverlap: 5,
            // condensed: false,
          },
        })

        cy.on(`mouseover`, `node`, function (e: EventObject) {
          const sel = e.target
          cy.elements()
            .difference(sel.outgoers().union(sel.incomers()))
            .not(sel)
            .addClass(`semitransp`)
          sel
            .addClass(`highlight`)
            .outgoers()
            .union(sel.incomers())
            .addClass(`highlight`)
        })
        cy.on(`mouseout`, `node`, function (e) {
          const sel = e.target
          cy.elements().removeClass(`semitransp`)
          sel
            .removeClass(`highlight`)
            .outgoers()
            .union(sel.incomers())
            .removeClass(`highlight`)
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
