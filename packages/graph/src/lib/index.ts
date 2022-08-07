import * as PIXI from "pixi.js"
import { Viewport } from "pixi-viewport"
import ColorHash from "color-hash"
import { setupFpsMonitor } from "./setup-fps-monitor"
import { GraphEvents, GraphGraphics, WorkerMessageType } from "./graph-enums"
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
import { Container, ParticleContainer } from "pixi.js"
import debounce from "lodash.debounce"
import { KnowledgeGraphDb } from "./db"
import { GraphInteraction } from "./graph-interaction"
import FontFaceObserver from "fontfaceobserver"
import { WebfontLoaderPlugin } from "pixi-webfont-loader"
import { NodeLabelHelper } from "./node-label"
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
  private options: KnowledgeGraphOptions<N, L> | undefined = {}
  private db: KnowledgeGraphDb = new KnowledgeGraphDb()
  private interaction: GraphInteraction<N, L>

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
    options?: KnowledgeGraphOptions<N, L>
  }) {
    if (options.graph?.customFont) {
      PIXI.Loader.registerPlugin(WebfontLoaderPlugin)
      PIXI.Loader.shared
        .add({
          name: `custom font`,
          url: options.graph?.customFont.url,
        })
        .load()
    }
    PIXI.Ticker.shared.maxFPS = this.options?.optimization?.maxTargetFPS ?? 60
    this.nodes = nodes
    this.links = links
    this.app = new PIXI.Application({
      backgroundColor: 0x131313,
      resizeTo: window,
      view: canvasElement,
      antialias: true,
    })
    this.options = options

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

    this.interaction = new GraphInteraction({
      options,
      app: this.app,
      viewport: this.viewport,
      lineGraphicsContainer: this.lineGraphicsContainer,
      nodes,
      links,
    })

    if (this.options?.optimization?.useParticleContainer)
      this.circleNodesContainer = new ParticleContainer(100_000)
    this.viewport.addChild(this.circleNodesContainer)

    this.setupConditionalNodeLabelsRenderer()

    this.circleNodesShadowContainer =
      this.options?.optimization?.useShadowContainer &&
      this.options?.optimization.useParticleContainer
        ? new Container()
        : null
    if (this.circleNodesShadowContainer) {
      this.circleNodesShadowContainer.visible = false
      this.circleNodesShadowContainer.renderable = false
      this.viewport.addChild(this.circleNodesShadowContainer)
    }

    this.culler.add(this.viewport)
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
    await Promise.all([
      new Promise((resolve) => {
        this.eventTarget.addEventListener(
          GraphEvents.FORCE_LAYOUT_COMPLETE,
          () => {
            resolve(GraphEvents.FORCE_LAYOUT_COMPLETE)
          },
          { once: true }
        )
      }),
      new Promise((resolve) => {
        if (!this.options?.graph?.customFont?.url) {
          console.log(PIXI.Loader.shared.resources)
          resolve(``)
        }
        PIXI.Loader.shared.onComplete.once(() => {
          console.log(PIXI.Loader.shared.resources)
          resolve(PIXI.Loader.shared.resources)
        })
      }),
    ])
    NodeLabelHelper.installMaybeCustomFont(
      this.options?.graph?.customFont?.config,
      this.options?.graph?.customFont?.option
    )
    this.conditionalNodeLabelsRenderer = new ConditionalNodeLabelsRenderer(
      this.viewport,
      // by now it must have coordinates
      this.nodes as WithCoords<N>[],
      this.links as LinkWithCoords[],
      this.db
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
    particleContainerCircles,
    normalContainerCircles,
    isFirstTimeUpdatingNodes,
    nodes,
  }: {
    circleTextureByParentId: Record<string, PIXI.RenderTexture>
    particleContainerCircles: Array<PIXI.Sprite>
    normalContainerCircles: Array<PIXI.Sprite>
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
          circleGraphics.destroy()
          circleTextureByParentId[parentId] = texture
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const fallbackCircleTexture = circleTextureByParentId[`default`]!

        const circleTexture =
          parentId && !this.options?.optimization?.useParticleContainer
            ? circleTextureByParentId[parentId]
            : fallbackCircleTexture
        const normalContainerCircle = new PIXI.Sprite(
          circleTexture ?? fallbackCircleTexture
        )
        const particleContainerCircle = this.options?.optimization
          ?.useParticleContainer
          ? new PIXI.Sprite(circleTexture ?? fallbackCircleTexture)
          : null
        normalContainerCircle.zIndex = 100

        if (node.x === undefined || node.y === undefined) return
        normalContainerCircle.x = node.x
        normalContainerCircle.y = node.y
        if (particleContainerCircle) {
          particleContainerCircle.x = node.x
          particleContainerCircle.y = node.y
        }
        // https://stackoverflow.com/questions/70302580/pixi-js-graphics-resize-normalContainerCircle-while-maintaining-center
        normalContainerCircle.pivot.x = normalContainerCircle.width / 2
        normalContainerCircle.pivot.y = normalContainerCircle.height / 2
        if (node.cc) {
          const scaleAmount = scaleByCC(node.cc)
          normalContainerCircle.scale.set(scaleAmount, scaleAmount)
          if (particleContainerCircle) {
            particleContainerCircle.scale.set(scaleAmount, scaleAmount)
            // pivot does not work for ParticleContainer, so manually adjust
            // for the pivot
            particleContainerCircle.y -= particleContainerCircle.height / 2
            particleContainerCircle.x -= particleContainerCircle.width / 2
          }
        }
        this.interaction.addEventListenersToCircle(normalContainerCircle, node)
        if (particleContainerCircle) {
          particleContainerCircles.push(particleContainerCircle)
        }
        normalContainerCircles.push(normalContainerCircle)
      } else {
        if (node.x === undefined || node.y === undefined) return
        // normalContainerCircles order is preserved across force directed graph iterations
        const normalCircle = normalContainerCircles[i]
        const particleCircle = particleContainerCircles?.[i]
        if (normalCircle) {
          normalCircle.x = node.x
          normalCircle.y = node.y
          this.interaction.addEventListenersToCircle(normalCircle, node)
        }
        if (particleCircle) {
          // pivot does not work for ParticleContainer, so manually adjust
          // for the pivot
          particleCircle.x = node.x - particleCircle.width / 2
          particleCircle.y = node.y - particleCircle.height / 2
        }
      }
    }
  }

  private addChildrenToCircleContainers({
    particleContainerCircles,
    normalContainerCircles,
  }: {
    particleContainerCircles: Array<PIXI.Sprite>
    normalContainerCircles: Array<PIXI.Sprite>
  }) {
    if (this.options?.optimization?.useParticleContainer) {
      if (particleContainerCircles.length > 0)
        this.circleNodesContainer.addChild(...particleContainerCircles)
      if (this.options.optimization.useShadowContainer) {
        if (normalContainerCircles.length > 0)
          this.circleNodesShadowContainer?.addChild(...normalContainerCircles)
      }
    } else {
      this.circleNodesContainer.addChild(...normalContainerCircles)
    }
  }

  public createNetworkGraph() {
    const particleContainerCircles: Array<PIXI.Sprite> = []
    const normalContainerCircles: Array<PIXI.Sprite> = []
    const fallbackCircleGraphics = new PIXI.Graphics()
      .lineStyle(5, 0xffffff, 1, 1, false)
      .beginFill(0xffffff, 1)
      .drawCircle(0, 0, GraphGraphics.CIRCLE_SIZE)
      .endFill()
    setupFpsMonitor(this.app)
    const circleTextureByParentId: Record<string, PIXI.RenderTexture> = {
      default: this.app.renderer.generateTexture(fallbackCircleGraphics),
    }

    let isFirstTimeUpdatingNodes = true
    this.graphWorker.onmessage = (msg) => {
      switch (msg.data.type) {
        case WorkerMessageType.UPDATE_NODE_CHILDREN: {
          this.nodes = msg.data.nodes
          this.links = msg.data.links

          this.updateNodes({
            circleTextureByParentId,
            particleContainerCircles,
            normalContainerCircles,
            isFirstTimeUpdatingNodes: true,
            nodes: this.nodes,
          })
          this.addChildrenToCircleContainers({
            particleContainerCircles,
            normalContainerCircles,
          })
          this.updateLinks({
            links: this.links,
          })
          this.interaction.updateNodesAndLinks({
            nodes: this.nodes,
            links: this.links,
          })
          this.eventTarget.dispatchEvent(
            new Event(GraphEvents.FORCE_LAYOUT_COMPLETE)
          )
          break
        }
        case WorkerMessageType.UPDATE_NODES: {
          this.updateNodes({
            circleTextureByParentId,
            particleContainerCircles,
            normalContainerCircles,
            isFirstTimeUpdatingNodes,
            nodes: msg.data.nodes,
          })
          this.interaction.updateNodesAndLinks({
            links: msg.data.nodes,
          })
          if (isFirstTimeUpdatingNodes) {
            this.addChildrenToCircleContainers({
              particleContainerCircles,
              normalContainerCircles,
            })
            isFirstTimeUpdatingNodes = false
          }
          break
        }
        case WorkerMessageType.UPDATE_LINKS: {
          this.updateLinks({
            links: msg.data.links,
          })
          this.interaction.updateNodesAndLinks({
            links: msg.data.links,
          })
          this.eventTarget.dispatchEvent(
            new Event(GraphEvents.FORCE_LAYOUT_COMPLETE)
          )
          break
        }
      }
    }

    if (this.options?.graph?.runForceLayout === false) {
      this.graphWorker.postMessage({
        type: WorkerMessageType.UPDATE_NODE_CHILDREN,
        nodes: this.nodes,
        links: this.links,
      })
      return
    }

    this.graphWorker.postMessage({
      type: WorkerMessageType.START_GRAPH,
      nodes: this.nodes,
      links: this.links,
    })
  }
}
