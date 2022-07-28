import { MovedEventType, Viewport } from "pixi-viewport"
import { Container } from "pixi.js"
import debounce from "lodash.debounce"
import {
  Link,
  LinkWithCoords,
  Node,
  WithCoords,
  WithPartialCoords,
  WithStringCoords,
} from "./types"
import { GraphScales, WorkerMessageType } from "./graphEnums"
import { NodeLabel } from "./node-label"
import * as PIXI from "pixi.js"
import { scaleByCC } from "./common-graph-util"
import { KnowledgeGraphDb } from "./db"
import Dexie, { PromiseExtended } from "dexie"
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
  private labelsMap: Record<Node[`id`], NodeLabel<Node>> = {}

  constructor(
    viewport: Viewport,
    nodes: WithCoords<Node>[],
    links: LinkWithCoords[]
  ) {
    this.viewport = viewport
    // this.graphComputationWorker.postMessage({
    //   type: WorkerMessageType.INIT_GRAPH_COMPUTATION_WORKER,
    //   nodes,
    //   links,
    // })
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

  private getLabelsToAppear() {
    const renderLabelsWithCCAboveOrEqual = this.scaleToChildrenCount(
      this.viewport.scale.x
    )
    console.log(this.viewport)
    const hitArea = this.viewport.hitArea
    if (!hitArea) return null
    console.log(hitArea)
    // @ts-ignore
    const xLow: number = hitArea.left
    // @ts-ignore
    const yLow: number = hitArea.top
    // @ts-ignore
    const xHigh: number = hitArea.right
    // @ts-ignore
    const yHigh: number = hitArea.bottom

    console.log({ xLow, xHigh, yHigh, yLow, renderLabelsWithCCAboveOrEqual })
    // const { query, cancel } = this.db.cancellableQuery(
    //   `r`,
    //   [this.db.nodes],
    //   () =>
    //     this.db.nodes
    //       .where([`cc`, `x`, `y`])
    //       .between(
    //         [
    //           String(renderLabelsWithCCAboveOrEqual),
    //           String(xLow.toFixed(0)),
    //           String(yLow.toFixed(0)),
    //         ],
    //         [Dexie.maxKey, String(xHigh.toFixed(0)), String(yHigh.toFixed(0))],
    //         true
    //       )
    //       // .and((node) => hitArea.contains(node.x, node.y))
    //       .toArray()
    // )
    const query = this.db.transaction(
      `rw`,
      [this.db.nodes, this.db.visibleNodes],
      async () => {
        const [a, b, c, visibleNodes] = await Promise.all([
          this.db.nodes.where(`x`).between(xLow, xHigh).primaryKeys(),
          this.db.nodes.where(`y`).between(yLow, yHigh).primaryKeys(),
          this.db.nodes
            .where(`cc`)
            .between(renderLabelsWithCCAboveOrEqual, Dexie.maxKey, true, true)
            .primaryKeys(),
          this.db.visibleNodes.toCollection().primaryKeys(),
        ])
        const minLen = Math.min(a.length, b.length, c.length)
        const visibleNodesSet = new Set(visibleNodes)
        const smallestAndSets = (() => {
          switch (true) {
            case minLen === a.length:
              return { smallest: a, set0: new Set(b), set1: new Set(c) }
            case minLen === b.length:
              return { smallest: b, set0: new Set(a), set1: new Set(c) }
            case minLen === c.length:
              return { smallest: c, set0: new Set(a), set1: new Set(b) }
            default:
              return { smallest: a, set0: new Set(b), set1: new Set(c) }
          }
        })()
        console.log(smallestAndSets)
        const nowVisibleNodeIds: Node[`id`][] = []
        const nowAppearingNodeIds: Node[`id`][] = []
        const nowDisappearingNodeIds: Node[`id`][] = []
        for (const nodeId of smallestAndSets.smallest) {
          if (
            smallestAndSets.set0.has(nodeId) &&
            smallestAndSets.set1.has(nodeId)
          ) {
            nowVisibleNodeIds.push(nodeId)
            if (!visibleNodesSet.has(nodeId)) {
              nowAppearingNodeIds.push(nodeId)
            }
          } else {
            if (visibleNodesSet.has(nodeId)) {
              nowDisappearingNodeIds.push(nodeId)
            }
          }
        }
        console.log({
          a,
          b,
          c,
          visibleNodes,
          nowDisappearingNodeIds,
        })
        // const nodesPrimaryKeys = smallestAndSets.smallest.filter((nodeId) => {
        //   return (
        //      &&

        //   )
        // })
        return Promise.all([
          this.db.nodes.bulkGet(nowAppearingNodeIds) as PromiseExtended<Node[]>,
          this.db.transaction(`rw`, [this.db.visibleNodes], async () => {
            // todo would using a plain Set() or object be faster than using a table?
            await this.db.visibleNodes.clear()
            await this.db.visibleNodes.bulkAdd(
              nowVisibleNodeIds.map((n) => ({
                id: n,
              }))
            )
          }),
          nowDisappearingNodeIds,
        ])
      }
    )
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const cancel = () => {}

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
    const t0 = performance.now()
    const [nodesToAppear, , nowDisappearingNodeIds] = await nodesToAppearPromise
    const t1 = performance.now()
    console.log(`took ${(t1 - t0) / 1000} secs`)
    this.cancelNodesToAppearPromise = null
    console.log(nodesToAppear)
    // this.labelsMap
    const labelsToDelete: NodeLabel<Node<string>>[] = []
    nowDisappearingNodeIds.forEach((id) => {
      if (id in this.labelsMap) {
        labelsToDelete.push(this.labelsMap[id] as NodeLabel<Node<string>>)
        delete this.labelsMap[id]
      }
    })
    this.nodeLabelsContainer.removeChild(...labelsToDelete)
    console.log(labelsToDelete, labelsToDelete.length)
    this.createBitmapTextsAsNodeLabels(nodesToAppear)
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
    const n = nodes.map(({ cc, ...rest }) => ({
      cc: cc ?? 0,
      ...rest,
    }))
    await this.db.transaction(
      `rw`,
      [this.db.nodes, this.db.links],
      async () => {
        return Promise.all([
          this.db.links.bulkAdd(links),
          this.db.nodes.bulkAdd(n),
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

  private createBitmapTextsAsNodeLabels(nodes: WithPartialCoords<Node>[]) {
    const labels: NodeLabel<Node>[] = []

    this.labelsMap = {}
    for (const node of nodes) {
      if (!node.title || node.x === undefined || node.y === undefined) continue
      const text = new NodeLabel<Node>(
        node.title,
        node as WithCoords<Node>,
        Number(node.cc ?? 0)
      )
      text.x = node.x
      text.y = node.y
      text.alpha = 0.7
      text.zIndex = 200
      labels.push(text)
      this.labelsMap[node.id] = text
    }
    // this.nodeLabelsContainer.removeChild()
    if (labels.length > 0) this.nodeLabelsContainer.addChild(...labels)
  }

  // private removeNodeLabelsIfNeeded(): Record<string, boolean> {
  //   const toBeDeleted: PIXI.DisplayObject[] = []
  //   const notDeleted: Record<string, boolean> = {}
  //   const minCc = this.scaleToChildrenCount(this.viewport.scale.x)

  //   switch (minCc) {
  //     case 20: {
  //       for (const text of this.nodeLabelsContainer.children as NodeLabel<
  //         WithCoords<Node>
  //       >[]) {
  //         const cc = text.getNodeData().cc ?? 0

  //         if (cc >= 20) {
  //           notDeleted[text.getNodeData().id] = true
  //         } else {
  //           toBeDeleted.push(text)
  //         }
  //       }
  //       break
  //     }
  //     case 0: {
  //       for (const text of this.nodeLabelsContainer.children as NodeLabel<
  //         WithCoords<Node>
  //       >[]) {
  //         if (this.viewport.hitArea?.contains(text.x, text.y)) {
  //           notDeleted[text.getNodeData().id] = true
  //         } else {
  //           toBeDeleted.push(text)
  //         }
  //       }
  //     }
  //   }
  //   this.viewport.removeChild(...toBeDeleted)

  //   return notDeleted
  // }
}
