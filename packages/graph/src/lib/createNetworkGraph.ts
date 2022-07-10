import * as PIXI from "pixi.js"
import createLayout from "ngraph.forcelayout"
import createGraph from "ngraph.graph"
import { Viewport } from "pixi-viewport"
import { create } from "web-worker-proxy"
import workerify from "./workerify"
import WorkerCode from "./graph.worker"
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
  console.log(import.meta.url)
  const worker: Worker & {
    // eslint-disable-next-line @typescript-eslint/ban-types
    setupGraph: Function
  } = create(
    new Worker(
      new URL(
        `./graph.worker.ts`,
        //@ts-ignore: tsconfig not recognized for some reason
        import.meta.url
      )
    )
  )
  await worker.setupGraph(nodes, links)

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

  const children: Array<PIXI.Sprite> = []
  // graph.forEachNode(function (node) {
  //   const pos = layout.getNodePosition(node.id)
  //   // Node position is pair of x,y coordinates:
  //   const circle = new PIXI.Sprite(texture)
  //   circle.x = pos.x
  //   circle.y = pos.y
  //   children.push(circle)
  // })

  // graph.forEachLink(function (link) {
  //   console.log(layout.getLinkPosition(link.id))
  //   // link position is a pair of two positions:
  //   // {
  //   //   from: {x: ..., y: ...},
  //   //   to: {x: ..., y: ...}
  //   // }
  // })
  // const rect = layout.getGraphRect()
  console.log(app.screen)
  // const r = new PIXI.Rectangle(
  //   rect.x1 - 100,
  //   rect.y1 - 100,
  //   Math.abs(rect.x1 - rect.x2) + 100,
  //   Math.abs(rect.y2 - rect.y1) + 100
  // )
  // app.screen.enlarge(r)
  // viewport.fit()
  // viewport.moveCenter(
  //   Math.abs(rect.x1 - rect.x2) / 2,
  //   Math.abs(rect.y2 - rect.y1) / 2
  // )

  // add a red box
  // viewport.pausePlugin('drag')

  // viewport.resumePlugin('drag')
  viewport.addChild(...children)
}
