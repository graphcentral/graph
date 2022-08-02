import { Viewport } from "pixi-viewport"
import * as PIXI from "pixi.js"
import { Container, ParticleContainer } from "pixi.js"
import { scaleByCC } from "./common-graph-util"
import { GraphGraphics } from "./graph-enums"
import {
  Node,
  Unpacked,
  WithPartialCoords,
  LinkWithPartialCoords,
  KnowledgeGraphOptions,
} from "./types"

export type InteractionState = {
  mousedownNodeId?: Node[`id`]
  prevHighlightedLinkIndices: {
    mousedown: number[]
    mouseover: number[]
  }
  eventTarget: EventTarget
}

export type InteractionColors = {
  selected?: number
  children?: number
}

export class GraphInteraction<
  N extends WithPartialCoords<Node>,
  L extends LinkWithPartialCoords
> {
  private options: KnowledgeGraphOptions<N, L> = {}
  private selectedCircleOutlineFeedback: PIXI.Sprite
  private nodes: N[] = []
  private app: PIXI.Application
  private links: L[] = []
  private lineGraphicsContainer = new Container()
  private linkedNodesContainer = new ParticleContainer()

  private interactionState: InteractionState = {
    prevHighlightedLinkIndices: {
      mousedown: [],
      mouseover: [],
    },
    eventTarget: new EventTarget(),
  }
  private colors: Required<InteractionColors> = {
    selected: 0xfe8888,
    children: 0xffffff,
  }

  constructor({
    options,
    app,
    viewport,
    lineGraphicsContainer,
    nodes,
    links,
    colors = {
      selected: 0xfe8888,
      children: 0xffffff,
    },
  }: {
    options: KnowledgeGraphOptions<N, L>
    app: PIXI.Application
    viewport: Viewport
    nodes: N[]
    links: L[]
    lineGraphicsContainer: Container
    colors?: Required<InteractionColors>
  }) {
    this.options = options
    this.app = app
    this.colors = colors
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

  private highlightLinkedNodes(node: N) {
    this.linkedNodesContainer.removeChildren()
    const circleGraphics = new PIXI.Graphics()
      .lineStyle(10, this.colors.children, 1, 1, false)
      .beginFill(0, 0)
      .drawCircle(0, 0, GraphGraphics.CIRCLE_SIZE)
      .endFill()
    const circleTexture = this.app.renderer.generateTexture(circleGraphics)
    circleGraphics.destroy()
    const highlightingCircles: PIXI.Sprite[] = []
    ;[node.children, node.parents]
      .map((each) => each ?? [])
      .forEach((each) => {
        each.forEach(({ node: nodeIndex }) => {
          const targetNode = this.nodes[nodeIndex]
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
          if (targetNode.cc) {
            const scaleAmount = scaleByCC(targetNode.cc)
            highlightingCircle.scale.set(scaleAmount * 1.4, scaleAmount * 1.4)
          }
          highlightingCircle.y -= highlightingCircle.height / 2
          highlightingCircle.x -= highlightingCircle.width / 2
          highlightingCircles.push(highlightingCircle)
        })
      })
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
      this.interactionState.mousedownNodeId = node.id
      this.turnOffHighlightInPreviousLinks(`mousedown`)
      this.turnOnHighlightInCurrentLinks(`mousedown`, node)
      this.options?.events?.onClick?.(node)
      this.showSelectedCircleOutlineFeedback(normalContainerCircle)
      this.highlightLinkedNodes(node)
    })

    if (this.options?.optimization?.useMouseHoverEffect) {
      // buttonMode will make cursor: pointer when hovered
      normalContainerCircle.buttonMode = true
      normalContainerCircle.on(`mouseover`, () => {
        normalContainerCircle.scale.set(
          normalContainerCircle.scale.x * GraphGraphics.CIRCLE_SCALE_FACTOR,
          normalContainerCircle.scale.y * GraphGraphics.CIRCLE_SCALE_FACTOR
        )
        if (this.interactionState.mousedownNodeId === node.id) return
        this.turnOnHighlightInCurrentLinks(`mouseover`, node)
      })
      normalContainerCircle.on(`mouseout`, () => {
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
