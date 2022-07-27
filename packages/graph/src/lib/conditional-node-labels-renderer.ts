import { MovedEventType, Viewport } from "pixi-viewport"
import { Container } from "pixi.js"
import debounce from "lodash.debounce"
import { Link, LinkWithCoords, Node, WithCoords } from "./types"
import { GraphScales, WorkerMessageType } from "./graphEnums"
import { NodeLabel } from "./node-label"
import * as PIXI from "pixi.js"
import { scaleByCC } from "./common-graph-util"
import { KnowledgeGraphDb } from "./db"
import { PromiseExtended } from "dexie"
import { render } from "enzyme"

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
 *
 * The strategy to meet this condition:
 *
 * Every time moved-end event happens,
 * 1. See if any of the labels need to appear
 * 2. See if any of the labels need to stay visible
 * 3. See if any of the labels need to disappear
 */
export class ConditionalNodeLabelsRenderer {
  private viewport: Viewport
  private nodeLabelsContainer = new Container()
  private graphComputationWorker: Worker = new Worker(
    new URL(`./graph-computation.worker.ts`, import.meta.url)
  )
  // private nodes: WithCoords<Node>[]
  // private links: LinkWithCoords[]
  private db = new KnowledgeGraphDb()

  constructor(
    viewport: Viewport,
    nodes: WithCoords<Node>[],
    links: LinkWithCoords[]
  ) {
    this.viewport = viewport
    this.graphComputationWorker.postMessage({
      type: WorkerMessageType.INIT_GRAPH_COMPUTATION_WORKER,
      nodes,
      links,
    })
    this.init(nodes, links)
  }

  public getNodeLabelsContainer(): Container {
    return this.nodeLabelsContainer
  }

  private getCCAndHitArea(): {
    cc: number
    hitArea: PIXI.IHitArea | null
  } {
    return {
      cc: this.scaleToChildrenCount(this.viewport.scale.x),
      hitArea: this.viewport.hitArea,
    }
  }

  private onMessageFromGraphComputationWorker(
    event: Parameters<NonNullable<Worker[`onmessage`]>>[0]
  ) {
    switch (event.data.type) {
      case WorkerMessageType.UPDATE_VISIBLE_NODES:
        this.createBitmapTextsAsNodeLabels(event.data.nodes, {})
        break
    }
  }

  private getLabelsToAppear() {
    const renderLabelsWithCCAboveOrEqual = this.scaleToChildrenCount(
      this.viewport.scale.x
    )
    console.log(this.viewport)
    const hitArea = this.viewport.hitArea
    if (!hitArea) return null
    console.log(hitArea)
    // @ts-ignore
    const x0: number = hitArea.x
    // @ts-ignore
    const y0: number = hitArea.y
    // @ts-ignore
    const x1: number = hitArea.x + hitArea.width
    // @ts-ignore
    const y1: number = hitArea.y - hitArea.height

    console.log({ x0, x1, y0, y1 })
    const { query, cancel } = this.db.cancellableQuery<
      WithCoords<Node<string>>[]
    >(`r`, [this.db.nodes], () =>
      this.db.nodes
        .where(`[cc+x+y]`)
        .between([renderLabelsWithCCAboveOrEqual, x0, y1], [Infinity, x1, y0])
        .toArray()
    )

    return {
      nodesToAppearPromise: query,
      cancel,
    }
  }
  private async getLabelsToStayVisible() {}
  private getLabelsToDisappear() {}

  private cancelNodesToAppearPromise: VoidFunction | null = null
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onMovedEnd = debounce(async (_movedEndEvent: MovedEventType) => {
    console.log(this.viewport.scale.x)
    this.cancelNodesToAppearPromise?.()
    const maybeLabelsToAppear = this.getLabelsToAppear()
    if (!maybeLabelsToAppear) return
    const { nodesToAppearPromise, cancel } = maybeLabelsToAppear
    this.cancelNodesToAppearPromise = cancel
    const nodesToAppear = await nodesToAppearPromise
    this.cancelNodesToAppearPromise = null
    console.log(nodesToAppear)
    this.createBitmapTextsAsNodeLabels(nodesToAppear, {})
    // this.graphComputationWorker.removeEventListener(
    //   `message`,
    //   this.getLabelsToAppear
    // )
    // this.graphComputationWorker.addEventListener(
    //   `message`,

    // )
    // this.graphComputationWorker.postMessage({
    //   type: WorkerMessageType.UPDATE_VISIBLE_NODES,
    //   minimumRenderCC: this.scaleToChildrenCount(this.viewport.scale.x),
    //   bounds: this.viewport.hitArea,
    // })
  }, 1000)

  private async init(nodes: WithCoords<Node>[], links: LinkWithCoords[]) {
    await this.db.delete().then(() => this.db.open())
    await this.db.transaction(
      `rw`,
      [this.db.nodes, this.db.links],
      async () => {
        return Promise.all([
          this.db.links.bulkAdd(links),
          this.db.nodes.bulkAdd(nodes),
        ])
      }
    )
    this.viewport.on(
      // includes zoom, drag, ... everything.
      // @ts-ignore
      `moved-end`,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (movedEndEvent: MovedEventType) => {
        this.cancelNodesToAppearPromise?.()
        this.onMovedEnd(movedEndEvent)
      }
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
    for (const node of nodes) {
      if (
        !node.title ||
        node.x === undefined ||
        node.y === undefined ||
        node.id in doNotDrawNodes
      )
        continue
      const text = new NodeLabel<WithCoords<Node>>(
        node.title,
        node as WithCoords<Node>,
        node.cc ?? 0
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
