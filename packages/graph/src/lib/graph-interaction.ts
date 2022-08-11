import { Viewport } from "pixi-viewport"
import * as PIXI from "pixi.js"
import { Container, ParticleContainer } from "pixi.js"
import { GraphEventEmitter } from "./graphEvents"
import { scaleByCC } from "./common-graph-util"
import { GraphGraphics, GraphZIndex } from "./graph-enums"
import {
  Node,
  Unpacked,
  WithPartialCoords,
  LinkWithPartialCoords,
  KnowledgeGraphOptions,
  WithCoords,
  LinkWithCoords,
  Link,
} from "./types"

export type InteractionState = {
  mousedownNodeId?: Node[`id`]
  prevHighlightedLinkIndices: {
    mousedown: number[]
    mouseover: number[]
  }
}

export type InteractionColors = {
  selected?: number
  children?: number
}

export class GraphInteraction<
  N extends WithCoords<Node>,
  L extends LinkWithCoords<Link>
> {
  private options: KnowledgeGraphOptions<N, L> = {}
  private selectedCircleOutlineFeedback: PIXI.Sprite
  private nodes: N[] = []
  private app: PIXI.Application
  private links: L[] = []
  private lineGraphicsContainer = new Container()
  private linkedNodesContainer = new ParticleContainer()
  private graphEventEmitter: GraphEventEmitter<N, L>
  private interactionState: InteractionState = {
    prevHighlightedLinkIndices: {
      mousedown: [],
      mouseover: [],
    },
  }
  private colors: Required<InteractionColors> = {
    selected: 0xfe8888,
    children: 0xfe8888,
  }
  private isGraphLayoutLoaded = false

  constructor({
    options,
    app,
    viewport,
    lineGraphicsContainer,
    nodes,
    links,
    colors = {
      selected: 0xfe8888,
      children: 0xfe8888,
    },
    graphEventEmitter,
  }: {
    options: KnowledgeGraphOptions<N, L>
    app: PIXI.Application
    viewport: Viewport
    nodes: N[]
    links: L[]
    lineGraphicsContainer: Container
    graphEventEmitter: GraphEventEmitter<N, L>
    colors?: Required<InteractionColors>
  }) {
    this.options = options
    this.app = app
    this.colors = colors
    this.graphEventEmitter = graphEventEmitter
    this.lineGraphicsContainer = lineGraphicsContainer
    this.selectedCircleOutlineFeedback = (() => {
      const circleGraphics = new PIXI.Graphics()
        .lineStyle(5, colors.selected, 1, 1, false)
        .beginFill(0, 0)
        .drawCircle(0, 0, GraphGraphics.CIRCLE_SIZE)
        .endFill()
      const circleTexture = app.renderer.generateTexture(circleGraphics)
      circleGraphics.destroy()
      return new PIXI.Sprite(circleTexture)
    })()

    this.selectedCircleOutlineFeedback.visible = false
    this.selectedCircleOutlineFeedback.renderable = false
    this.selectedCircleOutlineFeedback.zIndex = 300
    viewport.addChild(this.selectedCircleOutlineFeedback)
    viewport.addChild(this.linkedNodesContainer)

    this.nodes = nodes
    this.links = links
    this.graphEventEmitter.on(
      `finishLayout`,
      () => (this.isGraphLayoutLoaded = true)
    )
  }

  public updateNodesAndLinks({ nodes, links }: { nodes?: N[]; links?: L[] }) {
    if (nodes) this.nodes = nodes
    if (links) this.links = links
  }

  private turnOffHighlightInPreviousLinks(
    event: keyof InteractionState[`prevHighlightedLinkIndices`]
  ) {
    this.interactionState.prevHighlightedLinkIndices[event].forEach(
      (prevLinkIndex) => {
        const prevLinegraphics = this.lineGraphicsContainer.children[
          prevLinkIndex
        ] as PIXI.Graphics
        prevLinegraphics.tint = 0xffffff
      }
    )
    this.interactionState.prevHighlightedLinkIndices[event] = []
  }

  private turnOnHighlightInCurrentLinks(
    event: keyof InteractionState[`prevHighlightedLinkIndices`],
    node: N
  ) {
    ;[node.children, node.parents]
      .map((each) => each ?? [])
      .forEach((each) => {
        each.forEach((indices: Unpacked<NonNullable<Node[`children`]>>) => {
          this.interactionState.prevHighlightedLinkIndices[event].push(
            indices.link
          )
          const linkLineGraphics = this.lineGraphicsContainer.children[
            indices.link
          ] as PIXI.Graphics
          linkLineGraphics.tint = this.colors.selected
        })
      })
  }

  private showSelectedCircleOutlineFeedback(
    normalContainerCircle: PIXI.Sprite
  ) {
    this.selectedCircleOutlineFeedback.scale.set(
      normalContainerCircle.scale.x,
      normalContainerCircle.scale.y
    )
    this.selectedCircleOutlineFeedback.x =
      normalContainerCircle.x - normalContainerCircle.width / 2
    this.selectedCircleOutlineFeedback.y =
      normalContainerCircle.y - normalContainerCircle.height / 2
    this.selectedCircleOutlineFeedback.visible = true
    this.selectedCircleOutlineFeedback.renderable = true
  }

  private findLinkedNodes(node: N): N[] {
    return [node.children, node.parents]
      .map((each) => each ?? [])
      .flatMap((each) =>
        each.map(({ node: nodeIndex }) => this.nodes[nodeIndex])
      ) as N[]
  }

  private highlightLinkedNodes(linkedNodes: N[]) {
    this.linkedNodesContainer.removeChildren()
    const circleGraphics = new PIXI.Graphics()
      .lineStyle(10, this.colors.children, 1, 1, false)
      .beginFill(0, 0)
      .drawCircle(0, 0, GraphGraphics.CIRCLE_SIZE)
      .endFill()
    const circleTexture = this.app.renderer.generateTexture(circleGraphics)
    circleGraphics.destroy()
    const highlightingCircles: PIXI.Sprite[] = []
    linkedNodes.forEach((targetNode) => {
      const highlightingCircle = new PIXI.Sprite(circleTexture)
      if (
        !targetNode ||
        targetNode.x === undefined ||
        targetNode.y === undefined
      ) {
        return
      }
      highlightingCircle.x = targetNode.x
      highlightingCircle.y = targetNode.y
      highlightingCircle.zIndex = GraphZIndex.HIGHLIGHTING_CIRCLE
      if (targetNode.cc) {
        const scaleAmount = scaleByCC(targetNode.cc)
        highlightingCircle.scale.set(scaleAmount * 1.4, scaleAmount * 1.4)
      } else {
        const originalScaleWithoutCCAmplfier = highlightingCircle.scale.x
        highlightingCircle.scale.set(
          originalScaleWithoutCCAmplfier * 1.4,
          originalScaleWithoutCCAmplfier * 1.4
        )
      }
      highlightingCircle.y -= highlightingCircle.height / 2
      highlightingCircle.x -= highlightingCircle.width / 2
      highlightingCircles.push(highlightingCircle)
    })
    if (highlightingCircles.length > 0)
      this.linkedNodesContainer.addChild(...highlightingCircles)
  }

  public addEventListenersToCircle(
    normalContainerCircle: PIXI.Sprite,
    node: N
  ) {
    normalContainerCircle.off(`mousedown`)
    normalContainerCircle.off(`mouseover`)
    normalContainerCircle.off(`mouseout`)

    normalContainerCircle.interactive = true
    normalContainerCircle.on(`mousedown`, () => {
      if (!this.isGraphLayoutLoaded) return
      this.interactionState.mousedownNodeId = node.id
      this.turnOffHighlightInPreviousLinks(`mousedown`)
      this.turnOnHighlightInCurrentLinks(`mousedown`, node)
      const linkedNodes = this.findLinkedNodes(node)
      this.graphEventEmitter.emit(`clickNode`, { node, linkedNodes })
      this.showSelectedCircleOutlineFeedback(normalContainerCircle)
      this.highlightLinkedNodes(linkedNodes)
    })

    if (this.options?.optimization?.useMouseHoverEffect) {
      // buttonMode will make cursor: pointer when hovered
      normalContainerCircle.buttonMode = true
      normalContainerCircle.on(`mouseover`, () => {
        this.graphEventEmitter.emit(`mouseOverNode`, node)
        normalContainerCircle.scale.set(
          normalContainerCircle.scale.x * GraphGraphics.CIRCLE_SCALE_FACTOR,
          normalContainerCircle.scale.y * GraphGraphics.CIRCLE_SCALE_FACTOR
        )
        if (this.interactionState.mousedownNodeId === node.id) return
        this.turnOnHighlightInCurrentLinks(`mouseover`, node)
        this.graphEventEmitter.emit(`mouseOverNode`, node)
      })
      normalContainerCircle.on(`mouseout`, () => {
        this.graphEventEmitter.emit(`mouseOutNode`, node)
        normalContainerCircle.scale.set(
          normalContainerCircle.scale.x / GraphGraphics.CIRCLE_SCALE_FACTOR,
          normalContainerCircle.scale.y / GraphGraphics.CIRCLE_SCALE_FACTOR
        )
        this.turnOffHighlightInPreviousLinks(`mouseover`)
        if (this.interactionState.mousedownNodeId === node.id) {
          // we are using the same line graphics,
          // so if mouseout happens from the clicked node, it's possible that
          // lines pointing to the clicked node turn white again
          // this code prevents that
          this.turnOnHighlightInCurrentLinks(`mousedown`, node)
          return
        }
      })
    }
  }
}
