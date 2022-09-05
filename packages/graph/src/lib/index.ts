import { Viewport } from "pixi-viewport"
import ColorHash from "color-hash"
import { setupFpsMonitor } from "./setup-fps-monitor"
import { GraphGraphics, WorkerMessageType } from "./graph-enums"
import {
  WithPartialCoords,
  LinkWithPartialCoords,
  WithCoords,
  Node,
  LinkWithCoords,
  KnowledgeGraphOptions,
  ZoomLevels,
} from "./types"
import { scaleByCC, scaleToMinChildrenCount } from "./common-graph-util"
import { ConditionalNodeLabelsRenderer } from "./conditional-node-labels-renderer"
import debounce from "lodash.debounce"
import { KnowledgeGraphDb } from "./db"
import { GraphInteraction } from "./graph-interaction"
import { WebfontLoaderPlugin } from "pixi-webfont-loader"
import { NodeLabelHelper } from "./node-label"
import { Cull } from "@pixi-essentials/cull"
import {
  Container,
  ParticleContainer,
  Application,
  Loader,
  Ticker,
  Graphics,
  RenderTexture,
  Sprite,
  Point,
} from "pixi.js"
import Worker from "./graph.worker"
import { GraphEventEmitter } from "./graphEvents"

export class KnowledgeGraph<
  N extends WithPartialCoords<Node> = WithPartialCoords<Node>,
  L extends LinkWithPartialCoords = LinkWithPartialCoords
> {
  private nodes: N[]
  private links: L[]
  private app: Application
  private viewport: Viewport
  // @ts-ignore
  private graphWorker: Worker = new Worker()
  private conditionalNodeLabelsRenderer: ConditionalNodeLabelsRenderer<
    WithCoords<N>,
    LinkWithCoords<L>
  > | null = null
  private lineGraphicsContainer = new Container()
  private circleNodesContainer: ParticleContainer | Container = new Container()
  private circleNodesShadowContainer: Container | null = null
  /**
   * whether all the necessary steps for a fully functional, interactive graph
   * have been completed
   */
  private culler = new Cull()
  private options: KnowledgeGraphOptions<N, L> | undefined = {}
  private db: KnowledgeGraphDb = new KnowledgeGraphDb()
  private interaction: GraphInteraction<WithCoords<N>, LinkWithCoords<L>>
  public graphEventEmitter = new GraphEventEmitter<
    WithCoords<N>,
    LinkWithCoords<L>
  >()
  public isLoaded: Readonly<boolean> = false
  private zoomLevels?: ZoomLevels

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
      Loader.registerPlugin(WebfontLoaderPlugin)
      Loader.shared
        .add({
          name: `custom font`,
          url: options.graph?.customFont.url,
        })
        .load()
    }
    Ticker.shared.maxFPS = this.options?.optimization?.maxTargetFPS ?? 60
    this.nodes = nodes
    this.links = links
    this.app = new Application({
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
    window.addEventListener(`resize`, () => {
      this.viewport.resize(window.innerWidth, window.innerHeight)
    })
    this.viewport.sortableChildren = true
    this.viewport.drag().pinch().wheel().decelerate()
    this.app.stage.addChild(this.viewport)

    this.viewport.addChild(this.lineGraphicsContainer)
    this.lineGraphicsContainer.interactiveChildren = false
    this.lineGraphicsContainer.interactive = false

    this.interaction = new GraphInteraction<WithCoords<N>, LinkWithCoords<L>>({
      options,
      app: this.app,
      viewport: this.viewport,
      lineGraphicsContainer: this.lineGraphicsContainer,
      nodes: nodes as WithCoords<N>[],
      links: links as LinkWithCoords<L>[],
      graphEventEmitter: this.graphEventEmitter,
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

  private async setupConditionalNodeLabelsRenderer() {
    await Promise.all([
      new Promise((resolve) => {
        this.graphEventEmitter.one(`finishLayout`, () => {
          resolve(``)
        })
      }),
      new Promise((resolve) => {
        if (!this.options?.graph?.customFont?.url) {
          resolve(``)
        }
        Loader.shared.onComplete.once(() => {
          resolve(Loader.shared.resources)
        })
      }),
    ])
    NodeLabelHelper.installMaybeCustomFont(this.options?.graph?.customFont)
    this.conditionalNodeLabelsRenderer = new ConditionalNodeLabelsRenderer<
      WithCoords<N>,
      LinkWithCoords<L>
    >(
      this.viewport,
      // by now it must have coordinates
      this.nodes as WithCoords<N>[],
      this.links as LinkWithCoords[],
      this.graphEventEmitter,
      this.db,
      this.zoomLevels
    )
    await new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.conditionalNodeLabelsRenderer!.onInitComplete(resolve)
    })
    this.graphEventEmitter.emit(`finishDb`)
    this.isLoaded = true
    this.graphEventEmitter.emit(`finishGraph`, {
      nodes: this.nodes as WithCoords<N>[],
      links: this.links as LinkWithCoords<L>[],
    })
  }

  private updateLinks({ links }: { links: L[] }) {
    this.links = links
    const lines: Graphics[] = []
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
      const lineGraphics = new Graphics()
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
    circleTextureByParentId: Record<string, RenderTexture>
    particleContainerCircles: Array<Sprite>
    normalContainerCircles: Array<Sprite>
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
          const circleGraphics = new Graphics()
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
        const normalContainerCircle = new Sprite(
          circleTexture ?? fallbackCircleTexture
        )
        const particleContainerCircle = this.options?.optimization
          ?.useParticleContainer
          ? new Sprite(circleTexture ?? fallbackCircleTexture)
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
        this.interaction.addEventListenersToCircle(
          normalContainerCircle,
          node as WithCoords<N>
        )
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
          this.interaction.addEventListenersToCircle(
            normalCircle,
            node as WithCoords<N>
          )
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
    particleContainerCircles: Array<Sprite>
    normalContainerCircles: Array<Sprite>
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
    const particleContainerCircles: Array<Sprite> = []
    const normalContainerCircles: Array<Sprite> = []
    const fallbackCircleGraphics = new Graphics()
      .lineStyle(5, 0xffffff, 1, 1, false)
      .beginFill(0xffffff, 1)
      .drawCircle(0, 0, GraphGraphics.CIRCLE_SIZE)
      .endFill()
    setupFpsMonitor(this.app)
    const circleTextureByParentId: Record<string, RenderTexture> = {
      default: this.app.renderer.generateTexture(fallbackCircleGraphics),
    }

    let isFirstTimeUpdatingNodes = true
    this.graphWorker.onmessage = (msg) => {
      switch (msg.data.type) {
        case WorkerMessageType.FINISH_GRAPH: {
          this.interaction.updateNodesAndLinks({
            nodes: this.nodes as WithCoords<N>[],
            links: this.links as LinkWithCoords<L>[],
          })
          this.graphEventEmitter.emit(`finishLayout`, {
            nodes: this.nodes as WithCoords<N>[],
            links: this.links as LinkWithCoords<L>[],
          })
          break
        }
        case WorkerMessageType.UPDATE_NODE_CHILDREN: {
          this.updateNodes({
            circleTextureByParentId,
            particleContainerCircles,
            normalContainerCircles,
            isFirstTimeUpdatingNodes: true,
            nodes: msg.data.nodes,
          })
          this.addChildrenToCircleContainers({
            particleContainerCircles,
            normalContainerCircles,
          })
          this.updateLinks({
            links: msg.data.links,
          })
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
          if (isFirstTimeUpdatingNodes) {
            const firstNode = msg.data.nodes[0]
            if (firstNode?.x !== undefined && firstNode.y !== undefined) {
              this.viewport.moveCenter(new Point(firstNode.x, firstNode.y))
              this.viewport.fit(
                true,
                window.innerWidth * 5,
                window.innerHeight * 5
              )
            }
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

    this.graphEventEmitter.emit(`startLayout`)
    this.graphWorker.postMessage({
      type: WorkerMessageType.START_GRAPH,
      nodes: this.nodes,
      links: this.links,
    })
  }

  public moveTo(coords: Pick<N, `x` | `y`>) {
    if (coords.x === undefined || coords.y === undefined) return
    this.viewport.moveCenter(new Point(coords.x, coords.y))
    this.viewport.fit(true, window.innerWidth * 2.5, window.innerHeight * 2.5)
  }
}
