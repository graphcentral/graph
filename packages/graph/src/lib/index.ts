import * as PIXI from "pixi.js"
import { MovedEventType, Viewport } from "pixi-viewport"
import ColorHash from "color-hash"
import { setupFpsMonitor } from "./setupFpsMonitor"
import {
  GraphEvents,
  GraphGraphics,
  GraphScales,
  WorkerMessageType,
} from "./graphEnums"
// @ts-ignore
// import Test from "./test.txt"
import { Container } from "pixi.js"
import { debounce } from "lodash"

// console.log(Test)
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
  private graphComputationWorker: Worker = new Worker(
    new URL(`./graph-computation.worker.ts`, import.meta.url)
  )
  private maxNodeTitleLength = 35
  private nodeLabelsContainer = new Container()
  /**
   * whether drawing graph is finished
   */
  private isDrawing = true
  private isFontLoaded = false
  private eventTarget = new EventTarget()

  constructor({
    nodes,
    links,
    canvasElement,
  }: {
    nodes: N[]
    links: L[]
    /**
     * if you want to access it later, use this.app. to do sos
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
      interaction: this.app.renderer.plugins[`interaction`],
      passiveWheel: true,
    })
    this.viewport.sortableChildren = true
    this.viewport.drag().pinch().wheel().decelerate()
    this.app.stage.addChild(this.viewport)
    this.viewport.addChild(this.nodeLabelsContainer)
    this.setupListeners()
  }

  /**
   * @param scale decreases as user zooms out
   */
  private scaleToChildrenCount(scale: number): number {
    switch (true) {
      // only handle big nodes
      case scale <= 0: {
        console.log(`not accepted`)
        return -1
      }
      case scale < GraphScales.CAN_SEE_BIG_NODES_WELL: {
        // show text from nodes having cc above 20
        return 20
      }
      case scale > GraphScales.CAN_SEE_BIG_NODES_WELL: {
        // show text from nodes having cc above 0
        return 0
      }
    }

    return -1
  }

  /**
   * call this function only once as it sets up event listeners.
   */
  private async setupListeners() {
    await new Promise((resolve) => {
      this.eventTarget.addEventListener(
        GraphEvents.FORCE_LAYOUT_COMPLETE,
        () => {
          resolve(GraphEvents.FORCE_LAYOUT_COMPLETE)
        },
        { once: true }
      )
    })
    this.graphComputationWorker.postMessage({
      type: WorkerMessageType.INIT_GRAPH_COMPUTATION_WORKER,
      nodes: this.nodes,
      links: this.links,
    })

    let notDeleted: Record<string, boolean> = {}
    const onMessageFromGraphComputationWorker = (
      event: Parameters<NonNullable<Worker[`onmessage`]>>[0]
    ) => {
      switch (event.data.type) {
        case WorkerMessageType.FIND_NODES_INSIDE_BOUND:
          console.log(event)
          this.createBitmapTextsAsNodeLabels(event.data.nodes, notDeleted)
          break
      }
    }
    this.viewport.on(
      // includes zoom, drag, ... everything.
      // @ts-ignore
      `moved-end`,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      debounce((_movedEndEvent: MovedEventType) => {
        console.log(this.viewport.scale.x)
        notDeleted = this.removeNodeLabelsIfNeeded()
        // do not listen to the request for previous computation anymore
        // because the viewport has already moved to somewhere else
        this.graphComputationWorker.removeEventListener(
          `message`,
          onMessageFromGraphComputationWorker
        )
        this.graphComputationWorker.addEventListener(
          `message`,
          onMessageFromGraphComputationWorker
        )
        this.graphComputationWorker.postMessage({
          type: WorkerMessageType.FIND_NODES_INSIDE_BOUND,
          minimumRenderCC: this.scaleToChildrenCount(this.viewport.scale.x),
          bounds: this.viewport.hitArea,
        })
      }, 1000)
    )
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
    if (lines.length > 0) this.viewport.addChild(...lines)
  }

  /**
   *
   * @param cc node.cc (children count)
   * @returns scaled number bigger than cc
   */
  private scaleByCC(cc: number): number {
    return 1 + Math.log10(cc)
  }

  private removeNodeLabelsIfNeeded(): Record<string, boolean> {
    let toBeDeleted: PIXI.DisplayObject[] = []
    const notDeleted: Record<string, boolean> = {}
    const minCc = this.scaleToChildrenCount(this.viewport.scale.x)

    switch (minCc) {
      case 20: {
        toBeDeleted = this.nodeLabelsContainer.children
        break
      }
      case 0: {
        for (const text of this.nodeLabelsContainer.children) {
          if (this.viewport.hitArea?.contains(text.x, text.y)) {
            // todo change to node id
            notDeleted[`${text.x.toFixed(3)},${text.y.toFixed(3)}`] = true
            continue
          }
          toBeDeleted.push(text)
        }
      }
    }
    this.viewport.removeChild(...toBeDeleted)

    return notDeleted
  }

  private createBitmapTextsAsNodeLabels(
    nodes: N[],
    doNotDrawNodes: Record<string, boolean>
  ) {
    const texts: PIXI.BitmapText[] = []
    const fontName = `foobar`
    PIXI.BitmapFont.from(
      fontName,
      {
        fill: `#FFFFFF`,
        fontSize: 100,
        fontWeight: `bold`,
      },
      {
        resolution: window.devicePixelRatio,
        chars: [
          [`a`, `z`],
          [`A`, `Z`],
          [`0`, `9`],
          `~!@#$%^&*()_+-={}|:"<>?[]\\;',./ `,
        ],
      }
    )
    for (const node of nodes) {
      if (!node.title) continue
      if (
        node.x === undefined ||
        node.y === undefined
        // doNotDrawNodes[`${node.x.toFixed(3)}${node.y.toFixed(3)}`]
      )
        continue
      if (doNotDrawNodes[`${node.x.toFixed(3)},${node.y.toFixed(3)}`]) {
        continue
      }
      const initialTextScale = this.scaleByCC(node.cc ?? 0)
      const text = new PIXI.BitmapText(
        node.title.length > this.maxNodeTitleLength
          ? `${node.title.substring(0, this.maxNodeTitleLength)}...`
          : node.title,
        {
          fontSize: 100 * Math.max(1, initialTextScale),
          fontName,
        }
      )
      text.cacheAsBitmap = true
      text.x = node.x
      text.y = node.y
      text.alpha = 0.7
      text.zIndex = 200
      texts.push(text)
    }
    if (texts.length > 0) this.nodeLabelsContainer.addChild(...texts)
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
        circle.zIndex = 100
        if (node.x) circle.x = node.x
        if (node.y) circle.y = node.y
        // https://stackoverflow.com/questions/70302580/pixi-js-graphics-resize-circle-while-maintaining-center
        circle.pivot.x = circle.width / 2
        circle.pivot.y = circle.height / 2
        if (node.cc)
          circle.scale.set(this.scaleByCC(node.cc), this.scaleByCC(node.cc))
        circle.interactive = true
        circle.on(`mouseover`, () => {
          console.log(node)
          circle.scale.set(
            circle.scale.x * GraphGraphics.CIRCLE_SCALE_FACTOR,
            circle.scale.y * GraphGraphics.CIRCLE_SCALE_FACTOR
          )
          this.app.renderer.plugins[`interaction`].setCursorMode(`pointer`)
        })
        // circle.cullable = true
        circle.on(`mouseout`, () => {
          console.log(node)
          circle.scale.set(
            circle.scale.x / GraphGraphics.CIRCLE_SCALE_FACTOR,
            circle.scale.y / GraphGraphics.CIRCLE_SCALE_FACTOR
          )
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
            if (nodeChildren.length > 0) this.viewport.addChild(...nodeChildren)
            isFirstTimeUpdatingNodes = false
          }
          break
        }
        case WorkerMessageType.UPDATE_LINKS: {
          this.updateLinks({
            links: msg.data.links,
          })
          this.isDrawing = false
          this.eventTarget.dispatchEvent(
            new Event(GraphEvents.FORCE_LAYOUT_COMPLETE)
          )
          break
        }
      }
    }
  }
}
