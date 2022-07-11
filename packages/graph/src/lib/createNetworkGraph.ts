import * as PIXI from "pixi.js"
import createLayout from "ngraph.forcelayout"
import createGraph from "ngraph.graph"
import { Viewport } from "pixi-viewport"
import ColorHash from "color-hash"
import { setupFpsMonitor } from "./setupFpsMonitor"
/**
 * A type used to represent a single Notion 'block'
 * or 'node' as we'd like to call it in this graph-related project
 */
export type Node<Type = string> = {
  title?: string
  id: string
  /**
   * parent node's id
   */
  parentId?: Node[`id`]
  /**
   * children count
   */
  cc?: number
  type?: Type
}

export interface Link {
  source: Node[`id`]
  target: Node[`id`]
}

export async function createNetworkGraph<N extends Node, L extends Link>({
  nodes,
  links,
  canvasElement,
}: {
  nodes: N[]
  links: L[]
  canvasElement: HTMLCanvasElement
}) {
  //@ts-ignore
  const worker: Worker = new Worker(
    new URL(
      `./graph.worker.ts`,
      //@ts-ignore: tsconfig not recognized for some reason
      import.meta.url
    )
  )
  // worker.postMessage({ type: `start_process`, nodes, links })
  worker.postMessage({ type: `d3_start_process`, nodes, links })
  const app = new PIXI.Application({
    backgroundColor: 0x131313,
    resizeTo: window,
    view: canvasElement,
    // antialias: true,
    // autoDensity: true,
  })
  console.log(`d3_start_processe`)

  const viewport = new Viewport({
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    worldWidth: 1000,
    worldHeight: 1000,
    interaction: app.renderer.plugins[`interaction`],
    // passiveWheel: true,
    // stopPropagation: true,
  })
  app.stage.addChild(viewport)
  viewport.drag().pinch().wheel().decelerate()

  const fallbackCircleGraphics = new PIXI.Graphics()
    .lineStyle(0)
    .beginFill(0xffffff, 1)
    .drawCircle(0, 0, 4.5)
    .endFill()
  const circleTextureByParentId: Record<string, PIXI.RenderTexture> = {
    fallback: app.renderer.generateTexture(fallbackCircleGraphics),
  }
  const colorHash = new ColorHash()

  setupFpsMonitor(app)
  const children: Array<PIXI.Sprite> = []
  let firstTime = true
  worker.onmessage = (msg) => {
    switch (msg.data.type) {
      case `d3_update_process`: {
        for (const [i, node] of msg.data.nodePositions.entries()) {
          if (firstTime) {
            const parentId = node.parentId
            if (parentId && !(parentId in circleTextureByParentId)) {
              const c = parseInt(colorHash.hex(parentId).replace(/^#/, ``), 16)
              const circleGraphics = new PIXI.Graphics()
                .lineStyle(1, 0xfff, 1, 1, false)
                .beginFill(c, 1)
                .drawCircle(0, 0, 4.5)
                .endFill()
              const texture = app.renderer.generateTexture(circleGraphics)
              circleTextureByParentId[parentId] = texture
            }

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const fallbackCircleTexture = circleTextureByParentId[`default`]!
            const circle = new PIXI.Sprite(
              circleTextureByParentId[parentId] ?? fallbackCircleTexture
            )
            circle.x = node.x
            circle.y = node.y
            circle.interactive = true
            circle.on(`mouseover`, () => {
              console.log(node)
              circle.x -= 4
              circle.y -= 4
              circle.scale.set(2, 2)
            })
            circle.on(`mouseout`, () => {
              console.log(node)
              circle.x += 4
              circle.y += 4
              circle.scale.set(1, 1)
            })
            children.push(circle)
          } else {
            // children order is preserved across force directed graph iterations
            const child = children[i]
            if (child) {
              child.x = node.x
              child.y = node.y
            }
          }
        }
        if (firstTime) {
          viewport.addChild(...children)
          firstTime = false
        }
      }
    }
  }

  console.log(app.screen)
}
