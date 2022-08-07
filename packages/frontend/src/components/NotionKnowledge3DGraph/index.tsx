import React, { PropsWithChildren, useEffect, useRef } from "react"
import { FC } from "react"
import { NotionKnowledgeGraphFallback } from "src/components/NotionKnowledge3DGraph/fallback"
import { enhance, tcAsync } from "../../utilities/essentials"
import testData from "../../../../test-data/test4.json"
import SpriteText from "three-spritetext"
import a from "@graphcentral/logic"

console.log(a)
// eslint-disable-next-line @typescript-eslint/ban-types
export type NotionKnowledgeGraph3DImpureProps = {}

export const NotionKnowledge3DGraphImpure: FC<NotionKnowledgeGraph3DImpureProps> =
  enhance<NotionKnowledgeGraph3DImpureProps>(() => {
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

        const nkGraph = threeDForceGraphRef.current({ controlType: `orbit` })

        if (!nkGraph) return

        nkGraph(rootElem.current)
          .graphData(testData)
          .nodeAutoColorBy((node: any) => {
            // @ts-ignore
            return node.parentId
          })
          .nodeLabel(
            (node) =>
              // @ts-ignore
              node.title
          )
          .onNodeClick((node) => {
            // Aim at node from outside it
            const distance = 40
            const distRatio =
              1 +
              // @ts-ignore
              distance / Math.hypot(node.z, node.x, node.y)

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

            console.log(
              nkGraph.camera().position.set(
                // @ts-ignore
                node.x * distRatio,
                // @ts-ignore
                node.y * distRatio,
                // @ts-ignore
                node.z * distRatio
              )
            )
            console.log(nkGraph.camera())
            console.log(nkGraph.controls())
            // nkGraph.cameraPosition(
            //   newPos, // new position
            //   // @ts-ignore
            //   node, // lookAt ({ x, y, z })
            //   3000 // ms transition duration
            // )
          })
          .nodeThreeObject((node: any) => {
            const sprite = new SpriteText(node.title)
            // sprite.material.depthWrite = false // make sprite background transparent
            sprite.color = node.color
            sprite.textHeight =
              node.cc !== undefined ? Math.max(4, Math.min(node.cc, 20)) : 4
            return sprite
          })
          .enableNodeDrag(false)
          // 'td' | 'bu' | 'lr' | 'rl' | 'zout' | 'zin' | 'radialout' | 'radialin';
          .dagMode(`bu`)
          .dagLevelDistance(30)
          .linkCurvature(0.07)
          .onDagError(() => false)
          .d3AlphaDecay(0.02)
          .d3VelocityDecay(0.3)
          .linkAutoColorBy(
            // @ts-ignore
            (link) => link.target
          )
          .linkWidth(0.2)
          .linkOpacity(0.4)
          .backgroundColor(`#181818`)
        // .d3Force(`collide`, d3.forceCollide(13))

        nkGraph
          ?.d3Force(`link`)
          // @ts-ignore
          ?.distance(() => 50)
      }

      loadModule()
    }, [])

    return (
      <NotionKnowledgeGraph3DPure rootElem={rootElem}>
        2
      </NotionKnowledgeGraph3DPure>
    )
  })(NotionKnowledgeGraphFallback)

// eslint-disable-next-line @typescript-eslint/ban-types
export type NotionKnowledgeGraphPureP3Drops = PropsWithChildren<{
  rootElem: React.MutableRefObject<HTMLDivElement | null>
}>

export const NotionKnowledgeGraph3DPure: FC<NotionKnowledgeGraphPureP3Drops> =
  enhance<NotionKnowledgeGraphPureP3Drops>(({ rootElem, children }) => (
    <div ref={rootElem}>
      <p>{children}</p>
    </div>
  ))(NotionKnowledgeGraphFallback)
