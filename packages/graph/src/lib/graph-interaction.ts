import { Viewport } from "pixi-viewport"
import * as PIXI from "pixi.js"
import { Container } from "pixi.js"
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
}

export class GraphInteraction<
  N extends WithPartialCoords<Node>,
  L extends LinkWithPartialCoords
> {
  private options: KnowledgeGraphOptions<N, L> = {}
  private selectedCircleOutlineFeedback: PIXI.Sprite
  private nodes: N[] = []
  private links: L[] = []
  private lineGraphicsContainer = new Container()

  private interactionState: InteractionState = {
    prevHighlightedLinkIndices: {
      mousedown: [],
      mouseover: [],
    },
    eventTarget: new EventTarget(),
  }
  private colors: Required<InteractionColors> = {
    selected: 0xff0000,
  }

  constructor({
    options,
    app,
    viewport,
    lineGraphicsContainer,
    nodes,
    links,
    colors = {
      selected: 0xff0000,
    },
  }: {
    options: KnowledgeGraphOptions<N, L>
    app: PIXI.Application
    viewport: Viewport
    nodes: N[]
    links: L[]
    lineGraphicsContainer: Container
    colors?: InteractionColors
  }) {
    this.options = options
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
      .forEach((each, i) => {
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

  public addEventListenersToCircle(
    normalContainerCircle: PIXI.Sprite,
    node: N
  ) {
    normalContainerCircle.off(`mousedown`)
    normalContainerCircle.off(`mouseover`)
    normalContainerCircle.off(`mouseout`)

    normalContainerCircle.interactive = true
    normalContainerCircle.on(`mousedown`, () => {
      this.interactionState.eventTarget.dispatchEvent(new Event(`hi`))
      this.interactionState.mousedownNodeId = node.id
      this.turnOffHighlightInPreviousLinks(`mousedown`)
      this.turnOnHighlightInCurrentLinks(`mousedown`, node)
      this.options?.events?.onClick?.(node)
      this.showSelectedCircleOutlineFeedback(normalContainerCircle)
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
      // normalContainerCircle.cullable = true
      normalContainerCircle.on(`mouseout`, () => {
        normalContainerCircle.scale.set(
          normalContainerCircle.scale.x / GraphGraphics.CIRCLE_SCALE_FACTOR,
          normalContainerCircle.scale.y / GraphGraphics.CIRCLE_SCALE_FACTOR
        )
        if (this.interactionState.mousedownNodeId === node.id) return
        this.turnOffHighlightInPreviousLinks(`mouseover`)
      })
    }
  }
}
