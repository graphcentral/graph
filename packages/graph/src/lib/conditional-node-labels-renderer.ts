import { MovedEventType, Viewport } from "pixi-viewport"
import { Container } from "pixi.js"
import debounce from "lodash.debounce"
import { Link, Node, WithCoords } from "./types"
import { GraphScales, WorkerMessageType } from "./graphEnums"
import { NodeLabel } from "./node-label"
import * as PIXI from "pixi.js"
import { scaleByCC } from "./common-graph-util"

/**
 * Node Labels Renderer with Hierarchical Level of Detail
 *
 * When moved-end event fires, these things can happen:
 * 1. Labels for 'big' nodes (with large children count) may be invisible if zoomed out very much
 * 2. Labels for 'small' nodes (with small children count) may be invisible if zoomed out a bit
 * 3. Labels for 'small' nodes (with small children count) may be visible if zoomed in very much
 * 4. Labels for 'big' nodes (with large children count) may be visible if zoomed in a bit
 * 5. New labels appear if the zoom level does not change and location (x,y) of camera changes
 * 6. Old labels disappear in the previous camera location if the zoom level does not change and location (x,y) of camera changes
 * 7. Some existing labels stay visible if the zoom level does not change very much and new camera location includes some part of the previous camera location
 */
export class ConditionalNodeLabelsRenderer {
  private viewport: Viewport
  private nodeLabelsContainer = new Container()
  private graphComputationWorker: Worker = new Worker(
    new URL(`./graph-computation.worker.ts`, import.meta.url)
  )
  private maxNodeTitleLength = 35

  constructor(viewport: Viewport, nodes: WithCoords<Node>[], links: Link[]) {
    this.viewport = viewport
    this.graphComputationWorker.postMessage({
      type: WorkerMessageType.INIT_GRAPH_COMPUTATION_WORKER,
      nodes,
      links,
    })
  }

  public getNodeLabelsContainer(): Container {
    return this.nodeLabelsContainer
  }

  private init() {
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

  private createBitmapTextsAsNodeLabels(
    nodes: WithCoords<Node>[],
    doNotDrawNodes: Record<string, boolean>
  ) {
    const texts: NodeLabel<Node>[] = []
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
      if (node.x === undefined || node.y === undefined) continue
      if (doNotDrawNodes[node.id]) {
        continue
      }
      const initialTextScale = scaleByCC(node.cc ?? 0)
      const text = new NodeLabel<WithCoords<Node>>(
        node.title.length > this.maxNodeTitleLength
          ? `${node.title.substring(0, this.maxNodeTitleLength)}...`
          : node.title,
        node as WithCoords<Node>,
        {
          fontSize: 100 * Math.max(1, initialTextScale),
          fontName,
        }
      )
      text.x = node.x
      text.y = node.y
      text.alpha = 0.7
      text.zIndex = 200
      texts.push(text)
    }
    if (texts.length > 0) this.nodeLabelsContainer.addChild(...texts)
  }

  private removeNodeLabelsIfNeeded(): Record<string, boolean> {
    const toBeDeleted: PIXI.DisplayObject[] = []
    const notDeleted: Record<string, boolean> = {}
    const minCc = this.scaleToChildrenCount(this.viewport.scale.x)

    switch (minCc) {
      case 20: {
        for (const text of this.nodeLabelsContainer.children as NodeLabel<
          WithCoords<Node>
        >[]) {
          const cc = text.getNodeData().cc ?? 0

          if (cc >= 20) {
            notDeleted[text.getNodeData().id] = true
          } else {
            toBeDeleted.push(text)
          }
        }
        break
      }
      case 0: {
        for (const text of this.nodeLabelsContainer.children as NodeLabel<
          WithCoords<Node>
        >[]) {
          if (this.viewport.hitArea?.contains(text.x, text.y)) {
            notDeleted[text.getNodeData().id] = true
          } else {
            toBeDeleted.push(text)
          }
        }
      }
    }
    this.viewport.removeChild(...toBeDeleted)

    return notDeleted
  }
}
