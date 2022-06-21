import React, { useEffect, useRef } from "react"
import { FC } from "react"
import { NotionKnowledgeGraphFallback } from "src/components/NotionKnowledgeGraph/fallback"
import { enhance, tcAsync } from "../../utilities/essentials"
import testData from "../../../../test-data/test1.json"
import SpriteText from "three-spritetext"
// eslint-disable-next-line @typescript-eslint/ban-types
export type NotionKnowledgeGraphImpureProps = {}

export const NotionKnowledgeGraphImpure: FC<NotionKnowledgeGraphImpureProps> =
  enhance<NotionKnowledgeGraphImpureProps>(() => {
    const rootElem = useRef<HTMLDivElement | null>(null)
    const threeDForceGraphRef = useRef<
      | Awaited<
          // eslint-disable-next-line quotes
          typeof import("3d-force-graph")
        >[`default`]
      | null
    >(null)

    useEffect(() => {
      async function loadModule() {
        const [err, threeDForceGraph] = await tcAsync(import(`3d-force-graph`))

        if (err) {
          return
        } else {
          threeDForceGraphRef.current = threeDForceGraph.default
        }

        if (!rootElem.current) return

        const nkGraph = threeDForceGraphRef.current()

        if (!nkGraph) return

        nkGraph(rootElem.current)
          .graphData(testData)
          .nodeAutoColorBy(
            (node) =>
              // @ts-ignore
              node.parentId
          )
          .nodeLabel(
            (node) =>
              // @ts-ignore
              node.title
          )
          .onNodeClick((node) => {
            // Aim at node from outside it
            const distance = 40
            // @ts-ignore
            const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z)

            const newPos =
              // @ts-ignore
              node.x || node.y || node.z
                ? {
                    // @ts-ignore
                    x: node.x * distRatio,
                    // @ts-ignore
                    y: node.y * distRatio,
                    // @ts-ignore
                    z: node.z * distRatio,
                  }
                : { x: 0, y: 0, z: distance } // special case if node is in (0,0,0)

            nkGraph.cameraPosition(
              newPos, // new position
              // @ts-ignore
              node, // lookAt ({ x, y, z })
              3000 // ms transition duration
            )
          })
          .nodeThreeObject((node: any) => {
            const sprite = new SpriteText(node.title)
            // sprite.material.depthWrite = false // make sprite background transparent
            sprite.color = node.color
            sprite.textHeight = 3
            return sprite
          })

        nkGraph
          ?.d3Force(`link`)
          // @ts-ignore
          ?.distance(() => 100)

          // .dagMode(`lr`)
          // .dagLevelDistance(180)
          // .linkCurvature(0.07)
          // .onDagError(() => false)
          // .d3AlphaDecay(0.02)
          // .d3VelocityDecay(0.3)
          .enableNodeDrag(false)
        // .d3Force(`collide`, d3.forceCollide(13))
      }

      loadModule()
    }, [])

    return (
      <NotionKnowledgeGraphPure rootElem={rootElem}>2</NotionKnowledgeGraphPure>
    )
  })(NotionKnowledgeGraphFallback)

// eslint-disable-next-line @typescript-eslint/ban-types
export type NotionKnowledgeGraphPureProps = {
  rootElem: React.MutableRefObject<HTMLDivElement | null>
}

export const NotionKnowledgeGraphPure: FC<NotionKnowledgeGraphPureProps> =
  enhance<NotionKnowledgeGraphPureProps>(({ rootElem, children }) => (
    <div ref={rootElem}>
      <p>{children}</p>
    </div>
  ))(NotionKnowledgeGraphFallback)
