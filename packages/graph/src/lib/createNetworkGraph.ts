import * as PIXI from "pixi.js"
import createLayout from "ngraph.forcelayout"
import createGraph from "ngraph.graph"
import { Viewport } from "pixi-viewport"
import { create } from "web-worker-proxy"
import workerify from "./workerify"
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
  worker.postMessage({ type: `start_process`, nodes, links })
  // await worker.setupGraph(nodes, links)
  // const g = await worker.g
  // console.log(g)
  const app = new PIXI.Application({
    backgroundColor: 0x131313,
    resizeTo: window,
    view: canvasElement,
  })
  // app.renderer.plugins[`interaction`].autoPreventDefault = true
  // app.renderer.view.style.touchAction = `auto`

  const viewport = new Viewport({
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    worldWidth: 1000,
    worldHeight: 1000,

    interaction: app.renderer.plugins[`interaction`],
    passiveWheel: true,
    // stopPropagation: true,
  })
  app.stage.addChild(viewport)
  viewport.drag().pinch().wheel().decelerate()

  const circleTemplate = new PIXI.Graphics()
    .lineStyle(0)
    .beginFill(0xde3249, 1)
    .drawCircle(100, 250, 1)
    .endFill()

  const texture = app.renderer.generateTexture(circleTemplate)
  let children: Array<PIXI.Sprite> = []
  worker.onmessage = (msg) => {
    switch (msg.data.type) {
      case `update_process`: {
        viewport.removeChild(...children)
        children = []
        console.log(msg)
        for (const pos of msg.data.nodePositions) {
          const circle = new PIXI.Sprite(texture)
          circle.x = pos.x
          circle.y = pos.y
          children.push(circle)
        }
        viewport.addChild(...children)
      }
    }
  }

  console.log(app.screen)
}
