import * as PIXI from "pixi.js"
import createLayout from "ngraph.forcelayout"
import createGraph from "ngraph.graph"
import { Viewport } from "pixi-viewport"
import ColorHash from "color-hash"
import { setupFpsMonitor } from "./setupFpsMonitor"
import { Layer } from "@pixi/layers"
import { GraphGraphics, WorkerMessageType } from "./graphEnums"
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

export type Coords = {
  x: number
  y: number
}

export type WithCoords<T> = T & Coords
export type WithPartialCoords<T> = T & Partial<Coords>
export type LinkWithPartialCoords = {
  source: WithPartialCoords<Link[`source`]>
  target: WithPartialCoords<Link[`target`]>
}

export class KnowledgeGraph<
  N extends WithPartialCoords<Node>,
  L extends LinkWithPartialCoords
> {
  private nodes: N[]
  private links: L[]
  private app: PIXI.Application
  private viewport: Viewport
  private graphWorker: Worker = new Worker(
    new URL(`./graph.worker.ts`, import.meta.url)
  )
  /**
   * whether drawing graph is finished
   */
  private isDrawing = true
  private eventTarget = new EventTarget()

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
      antialias: true,
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
    this.viewport.sortableChildren = true
    this.viewport.drag().pinch().wheel().decelerate()
    this.app.stage.addChild(this.viewport)
  }

  private updateLinks({ links }: { links: L[] }) {
    this.links = links
    const lines: PIXI.Graphics[] = []
    for (const link of links) {
      const { x: sourceX, y: sourceY } = link.source
      const { x: targetX, y: targetY } = link.target
      if (
        sourceX === undefined ||
        sourceY === undefined ||
        targetX === undefined ||
        targetY === undefined
      )
        continue
      const lineGraphics = new PIXI.Graphics()
        .lineStyle(3, 0xffffff, 0.7, 1, false)
        .moveTo(sourceX, sourceY)
        // This is the length of the line. For the x-position, that's 600-30 pixels - so your line was 570 pixels long.
        // Multiply that by p, making it longer and longer. Finally, it's offset by the 30 pixels from your moveTo above. So, when p is 0, the line moves to 30 (not drawn at all), and when p is 1, the line moves to 600 (where it was for you). For y, it's the same, but with your y values.
        .lineTo(targetX, targetY)
        .endFill()
      lines.push(lineGraphics)
    }
    this.viewport.addChild(...lines)
  }

  private updateNodes({
    circleTextureByParentId,
    nodeChildren,
    isFirstTimeUpdatingNodes,
    nodes,
  }: {
    circleTextureByParentId: Record<string, PIXI.RenderTexture>
    nodeChildren: Array<PIXI.Sprite>
    isFirstTimeUpdatingNodes: boolean
    nodes: WithPartialCoords<N>[]
  }) {
    this.nodes = nodes
    const colorHash = new ColorHash()
    for (const [i, node] of nodes.entries()) {
      if (isFirstTimeUpdatingNodes) {
        const parentId = node.parentId
        if (parentId && !(parentId in circleTextureByParentId)) {
          const c = parseInt(colorHash.hex(parentId).replace(/^#/, ``), 16)
          const circleGraphics = new PIXI.Graphics()
            .lineStyle(5, 0xffffff, 1, 1, false)
            .beginFill(c, 1)
            .drawCircle(0, 0, GraphGraphics.CIRCLE_SIZE)
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
        circle.zOrder = 100
        circle.zIndex = 100
        if (node.x) circle.x = node.x
        if (node.y) circle.y = node.y
        // https://stackoverflow.com/questions/70302580/pixi-js-graphics-resize-circle-while-maintaining-center
        circle.pivot.x = circle.width / 2
        circle.pivot.y = circle.height / 2
        if (node.cc)
          circle.scale.set(1 + Math.log10(node.cc), 1 + Math.log10(node.cc))
        circle.interactive = true
        circle.on(`mouseover`, () => {
          console.log(node)
          circle.scale.set(circle.scale.x + 0.3, circle.scale.y + 0.3)
          this.app.renderer.plugins[`interaction`].setCursorMode(`pointer`)
        })
        circle.on(`mouseout`, () => {
          console.log(node)
          circle.scale.set(circle.scale.x - 0.3, circle.scale.y - 0.3)
          this.app.renderer.plugins[`interaction`].setCursorMode(`auto`)
        })
        nodeChildren.push(circle)
      } else {
        // nodeChildren order is preserved across force directed graph iterations
        const child = nodeChildren[i]
        if (child) {
          if (node.x) child.x = node.x
          if (node.y) child.y = node.y
        }
      }
    }
  }

  public async createNetworkGraph() {
    this.graphWorker.postMessage({
      type: WorkerMessageType.START_GRAPH,
      nodes: this.nodes,
      links: this.links,
    })

    const fallbackCircleGraphics = new PIXI.Graphics()
      .lineStyle(0)
      .beginFill(0xffffff, 1)
      .drawCircle(0, 0, GraphGraphics.CIRCLE_SIZE)
      .endFill()
    setupFpsMonitor(this.app)
    const circleTextureByParentId: Record<string, PIXI.RenderTexture> = {
      fallback: this.app.renderer.generateTexture(fallbackCircleGraphics),
    }
    const nodeChildren: Array<PIXI.Sprite> = []
    let isFirstTimeUpdatingNodes = true
    this.graphWorker.onmessage = (msg) => {
      switch (msg.data.type) {
        case WorkerMessageType.UPDATE_NODES: {
          this.updateNodes({
            circleTextureByParentId,
            nodeChildren,
            isFirstTimeUpdatingNodes,
            nodes: msg.data.nodes,
          })
          if (isFirstTimeUpdatingNodes) {
            this.viewport.addChild(...nodeChildren)
            isFirstTimeUpdatingNodes = false
          }
          break
        }
        case WorkerMessageType.UPDATE_LINKS: {
          this.updateLinks({
            links: msg.data.links,
          })
          this.isDrawing = false
          this.eventTarget.dispatchEvent(new Event(`is_dr`))
          break
        }
      }
    }
  }
}
