import * as PIXI from "pixi.js"
import { Viewport } from "pixi-viewport"
import ColorHash from "color-hash"
import { setupFpsMonitor } from "./setup-fps-monitor"
import { GraphEvents, GraphGraphics, WorkerMessageType } from "./graph-enums"
// @ts-ignore
// import Test from "./test.txt"
import {
  WithPartialCoords,
  LinkWithPartialCoords,
  WithCoords,
  Node,
  LinkWithCoords,
  KnowledgeGraphOptions,
} from "./types"
import { scaleByCC, scaleToMinChildrenCount } from "./common-graph-util"
import { ConditionalNodeLabelsRenderer } from "./conditional-node-labels-renderer"
import { Cull } from "@pixi-essentials/cull"
import { Container, ParticleContainer, Rectangle } from "pixi.js"
import debounce from "lodash.debounce"

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
  private conditionalNodeLabelsRenderer: ConditionalNodeLabelsRenderer | null =
    null
  private eventTarget = new EventTarget()
  private lineGraphicsContainer = new Container()
  private circleNodesContainer: ParticleContainer | Container = new Container()
  private circleNodesShadowContainer: Container | null = null
  /**
   * whether all the necessary steps for a fully functional, interactive graph
   * have been completed
   */
  public isLoaded: Readonly<boolean> = false
  private culler = new Cull()
  private options: KnowledgeGraphOptions | undefined = {}
  constructor({
    nodes,
    links,
    canvasElement,
    options = {
      optimization: {
        showEdgesOnCloseZoomOnly: true,
      },
    },
  }: {
    nodes: N[]
    links: L[]
    /**
     * if you want to access it later, use this.app. to do sos
     */
    canvasElement: HTMLCanvasElement
    options?: KnowledgeGraphOptions
  }) {
    PIXI.Ticker.shared.maxFPS = this.options?.optimization?.maxTargetFPS ?? 60
    this.nodes = nodes
    this.links = links
    this.app = new PIXI.Application({
      backgroundColor: 0x131313,
      resizeTo: window,
      view: canvasElement,
      antialias: true,
      // autoDensity: true,
    })
    this.options = options
    if (this.options?.optimization?.useParticleContainer)
      this.circleNodesContainer = new ParticleContainer(100_000)
    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      interaction: this.app.renderer.plugins[`interaction`],
      passiveWheel: true,
    })
    this.viewport.sortableChildren = true
    this.viewport.drag().pinch().wheel().decelerate()
    this.app.stage.addChild(this.viewport)
    this.viewport.addChild(this.lineGraphicsContainer)
    this.lineGraphicsContainer.interactiveChildren = false
    this.lineGraphicsContainer.interactive = false
    this.viewport.addChild(this.circleNodesContainer)
    this.setupConditionalNodeLabelsRenderer()

    this.circleNodesShadowContainer =
      this.options.optimization?.useShadowContainer &&
      this.options.optimization.useParticleContainer
        ? new Container()
        : null
    if (this.circleNodesShadowContainer) {
      this.circleNodesShadowContainer.visible = false
      this.circleNodesShadowContainer.renderable = false
      this.viewport.addChild(this.circleNodesShadowContainer)
    }
    this.culler.add(this.viewport)
    this.viewport.on(`drag-start`, () => {
      // console.log(`moved`)
      // this.lineGraphicsContainer.visible = false
      // this.lineGraphicsContainer.renderable = false
    })
    this.viewport.on(`zoomed`, () => {
      // console.log(`moved`)
      // this.lineGraphicsContainer.visible = false
      // this.lineGraphicsContainer.renderable = false
    })
    this.viewport.on(
      `moved-end`,
      debounce(() => {
        const minChildrenCount = scaleToMinChildrenCount(this.viewport.scale.x)
        if (this.options?.optimization?.showEdgesOnCloseZoomOnly) {
          if (minChildrenCount === Infinity) {
            this.lineGraphicsContainer.visible = false
            this.lineGraphicsContainer.renderable = false
          } else {
            this.lineGraphicsContainer.visible = true
            this.lineGraphicsContainer.renderable = true
          }
        }
        if (
          this.options?.optimization?.useParticleContainer &&
          this.options?.optimization?.useShadowContainer
        ) {
          if (!this.circleNodesShadowContainer) return
          if (minChildrenCount <= 20) {
            this.circleNodesShadowContainer.visible = true
            this.circleNodesShadowContainer.renderable = true
          } else {
            this.circleNodesShadowContainer.visible = false
            this.circleNodesShadowContainer.renderable = false
          }
        }
        // console.log(`moved`)
      }, 100)
    )
    this.app.renderer.on(`prerender`, () => {
      // Cull out all objects that don't intersect with the screen
      this.culler.cull(this.app.renderer.screen)
    })
  }

  public onLoadGraphComplete(cb: (...params: any[]) => any) {
    this.eventTarget.addEventListener(GraphEvents.LOAD_GRAPH_COMPLETE, cb, {
      once: true,
    })
  }

  private async setupConditionalNodeLabelsRenderer() {
    await new Promise((resolve) => {
      this.eventTarget.addEventListener(
        GraphEvents.FORCE_LAYOUT_COMPLETE,
        () => {
          resolve(GraphEvents.FORCE_LAYOUT_COMPLETE)
        },
        { once: true }
      )
    })
    this.conditionalNodeLabelsRenderer = new ConditionalNodeLabelsRenderer(
      this.viewport,
      // by now it must have coordinates
      this.nodes as WithCoords<N>[],
      this.links as LinkWithCoords[]
    )
    await new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.conditionalNodeLabelsRenderer!.onInitComplete(resolve)
    })
    this.isLoaded = true
    this.eventTarget.dispatchEvent(new Event(GraphEvents.LOAD_GRAPH_COMPLETE))
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
        .lineTo(targetX, targetY)
        .endFill()
      lines.push(lineGraphics)
    }
    if (lines.length > 0) {
      this.lineGraphicsContainer.addChild(...lines)
    }
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
        node.cc = node.cc ?? 0
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

        const circleTexture =
          parentId && !this.options?.optimization?.useParticleContainer
            ? circleTextureByParentId[parentId]
            : fallbackCircleTexture
        const circle = new PIXI.Sprite(circleTexture ?? fallbackCircleTexture)
        circle.zIndex = 100
        if (node.x) circle.x = node.x
        if (node.y) circle.y = node.y
        // https://stackoverflow.com/questions/70302580/pixi-js-graphics-resize-circle-while-maintaining-center
        circle.pivot.x = circle.width / 2
        circle.pivot.y = circle.height / 2
        if (node.cc) circle.scale.set(scaleByCC(node.cc), scaleByCC(node.cc))
        circle.buttonMode = true
        circle.interactive = true
        circle.on(`mouseover`, () => {
          console.log(node)
          circle.scale.set(
            circle.scale.x * GraphGraphics.CIRCLE_SCALE_FACTOR,
            circle.scale.y * GraphGraphics.CIRCLE_SCALE_FACTOR
          )
        })
        // circle.cullable = true
        circle.on(`mouseout`, () => {
          console.log(node)
          circle.scale.set(
            circle.scale.x / GraphGraphics.CIRCLE_SCALE_FACTOR,
            circle.scale.y / GraphGraphics.CIRCLE_SCALE_FACTOR
          )
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

  public createNetworkGraph() {
    const nodeChildren: Array<PIXI.Sprite> = []
    const fallbackCircleGraphics = new PIXI.Graphics()
      .lineStyle(5, 0xffffff, 1, 1, false)
      .beginFill(0xffffff, 1)
      .drawCircle(0, 0, GraphGraphics.CIRCLE_SIZE)
      .endFill()
    setupFpsMonitor(this.app)
    const circleTextureByParentId: Record<string, PIXI.RenderTexture> = {
      default: this.app.renderer.generateTexture(fallbackCircleGraphics),
    }

    if (this.options?.graph?.runForceLayout === false) {
      this.updateNodes({
        circleTextureByParentId,
        nodeChildren,
        isFirstTimeUpdatingNodes: true,
        nodes: this.nodes,
      })
      if (nodeChildren.length > 0) {
        this.circleNodesContainer.addChild(...nodeChildren)
        this.circleNodesShadowContainer?.addChild(...nodeChildren)
      }
      this.updateLinks({
        links: this.links,
      })
      this.eventTarget.dispatchEvent(
        new Event(GraphEvents.FORCE_LAYOUT_COMPLETE)
      )

      return
    }

    this.graphWorker.postMessage({
      type: WorkerMessageType.START_GRAPH,
      nodes: this.nodes,
      links: this.links,
    })

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
            if (nodeChildren.length > 0) {
              this.circleNodesContainer.addChild(...nodeChildren)
            }

            isFirstTimeUpdatingNodes = false
          }
          break
        }
        case WorkerMessageType.UPDATE_LINKS: {
          this.updateLinks({
            links: msg.data.links,
          })
          this.eventTarget.dispatchEvent(
            new Event(GraphEvents.FORCE_LAYOUT_COMPLETE)
          )
          break
        }
      }
    }
  }
}
