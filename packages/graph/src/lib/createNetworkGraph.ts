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
   * nodeChildren count
   */
  cc?: number
  type?: Type
}

export interface Link {
  source: Node[`id`]
  target: Node[`id`]
}

export class KnowledgeGraph<N extends Node, L extends Link> {
  private nodes: N[]
  private links: L[]
  private app: PIXI.Application
  private viewport: Viewport
  private graphWorker: Worker = new Worker(
    new URL(
      `./graph.worker.ts`,
      //@ts-ignore: tsconfig not recognized for some reason
      import.meta.url
    )
  )

  constructor({
    nodes,
    links,
    canvasElement,
  }: {
    nodes: N[]
    links: L[]
    /**
     * if you want to access it later, use this.app. to do so
     */
    canvasElement: HTMLCanvasElement
  }) {
    this.nodes = nodes
    this.links = links
    this.app = new PIXI.Application({
      backgroundColor: 0x131313,
      resizeTo: window,
      view: canvasElement,
      // antialias: true,
      // autoDensity: true,
    })
    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: 1000,
      worldHeight: 1000,
      interaction: this.app.renderer.plugins[`interaction`],
      passiveWheel: true,
      // stopPropagation: true,
    })
    this.viewport.drag().pinch().wheel().decelerate()
    this.app.stage.addChild(this.viewport)
  }

  private handleUpdateGraph({
    circleTextureByParentId,
    nodeChildren,
    lineChildren,
    isFirstTime,
    nodes,
  }: {
    circleTextureByParentId: Record<string, PIXI.RenderTexture>
    nodeChildren: Array<PIXI.Sprite>
    lineChildren: Array<PIXI.Geometry>
    isFirstTime: boolean
    nodes: (Node & {
      x: number
      y: number
    })[]
  }) {
    const colorHash = new ColorHash()
    for (const [i, node] of nodes.entries()) {
      if (isFirstTime) {
        const parentId = node.parentId
        if (parentId && !(parentId in circleTextureByParentId)) {
          const c = parseInt(colorHash.hex(parentId).replace(/^#/, ``), 16)
          const circleGraphics = new PIXI.Graphics()
            .lineStyle(1, 0xfff, 1, 1, false)
            .beginFill(c, 1)
            .drawCircle(0, 0, 4.5)
            .endFill()
          const texture = this.app.renderer.generateTexture(circleGraphics)
          circleTextureByParentId[parentId] = texture
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const fallbackCircleTexture = circleTextureByParentId[`default`]!

        const circleTexture = parentId
          ? circleTextureByParentId[parentId]
          : fallbackCircleTexture
        const circle = new PIXI.Sprite(circleTexture ?? fallbackCircleTexture)
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
        nodeChildren.push(circle)
      } else {
        // nodeChildren order is preserved across force directed graph iterations
        const child = nodeChildren[i]
        if (child) {
          child.x = node.x
          child.y = node.y
        }
      }
    }
  }

  public async createNetworkGraph() {
    this.graphWorker.postMessage({
      type: `start_process`,
      nodes: this.nodes,
      links: this.links,
    })

    const fallbackCircleGraphics = new PIXI.Graphics()
      .lineStyle(0)
      .beginFill(0xffffff, 1)
      .drawCircle(0, 0, 4.5)
      .endFill()

    setupFpsMonitor(this.app)
    const circleTextureByParentId: Record<string, PIXI.RenderTexture> = {
      fallback: this.app.renderer.generateTexture(fallbackCircleGraphics),
    }
    const nodeChildren: Array<PIXI.Sprite> = []
    const lineChildren: Array<PIXI.Geometry> = []
    let isFirstTime = true
    this.graphWorker.onmessage = (msg) => {
      switch (msg.data.type) {
        case `update_graph`: {
          this.handleUpdateGraph({
            circleTextureByParentId,
            nodeChildren,
            lineChildren,
            isFirstTime,
            nodes: msg.data.nodes,
          })
          if (isFirstTime) {
            this.viewport.addChild(...nodeChildren)
            isFirstTime = false
          }
          break
        }
      }
    }
  }
}
