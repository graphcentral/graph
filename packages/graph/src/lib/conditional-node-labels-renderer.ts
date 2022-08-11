/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Viewport } from "pixi-viewport"
import { Container } from "pixi.js"
import debounce from "lodash.debounce"
import {
  CustomFontConfig,
  Link,
  LinkWithCoords,
  LinkWithPartialCoords,
  Node,
  NodeLabel,
  NotSmallestNextVisibilityInput,
  SmallestNextVisibilityInput,
  WithCoords,
  WithPartialCoords,
} from "./types"
import { GraphEvents, RENDER_ALL } from "./graph-enums"
import { NodeLabelHelper } from "./node-label"
import { KnowledgeGraphDb } from "./db"
import Dexie, { PromiseExtended } from "dexie"
import to from "await-to-js"
import { scaleToMinChildrenCount } from "./common-graph-util"
import { GraphEventEmitter } from "./graphEvents"

/**
 * Node labels renderer with Hierarchical Level of Detail (HLoD) and culling (only rendering what is currently seen by the camera)
 *
 * When `moved-end` event fires, these things can happen:
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
export class ConditionalNodeLabelsRenderer<
  N extends WithCoords<Node>,
  L extends LinkWithCoords
> {
  /**
   * Viewport of the application.
   */
  private viewport: Viewport
  /**
   * Container that stores all labels.
   */
  private nodeLabelsContainer = new Container()
  /**
   * This is always defined!!
   * The typing is just because of how TS works
   */
  private db: KnowledgeGraphDb | null = null
  private visibleLabelsMap: Record<Node[`id`], NodeLabel<Node>> = {}
  // only used for events inside this class
  private eventTarget = new EventTarget()
  // used for events outside this class
  private graphEventEmitter: GraphEventEmitter<N, L>
  private initComplete = false
  private customFont: CustomFontConfig

  constructor(
    viewport: Viewport,
    nodes: WithCoords<Node>[],
    links: LinkWithCoords[],
    graphEventEmitter: GraphEventEmitter<N, L>,
    /**
     * Optional db instantiated from outside of the class
     */
    db?: KnowledgeGraphDb,
    customFont?: CustomFontConfig
  ) {
    this.viewport = viewport
    this.graphEventEmitter = graphEventEmitter
    this.nodeLabelsContainer.interactive = false
    this.nodeLabelsContainer.interactiveChildren = false
    this.viewport.addChild(this.nodeLabelsContainer)
    this.db = db ?? new KnowledgeGraphDb()
    this.customFont = customFont
    this.initDb(nodes, links)
    this.initMovedEndListener()
  }

  public onError(cb: VoidFunction) {
    this.eventTarget.addEventListener(GraphEvents.ERROR, cb)
  }

  /**
   * IndexedDB takes some time to be initialized
   */
  public onInitComplete(cb: (...params: any[]) => any) {
    this.eventTarget.addEventListener(
      GraphEvents.FINISH_DB,
      () => {
        this.initComplete = true
        cb()
      },
      {
        once: true,
      }
    )
  }

  public getNodeLabelsContainer(): Container {
    return this.nodeLabelsContainer
  }

  /**
   * Since the indexedDB query returns plain arrays containing primary keys,
   * we need to turn some of them into `Set` for operations with better time complexities
   */
  private optimizeNextLabelVisibilityInputs({
    nodeIdsWithinXRange,
    nodeIdsWithinYRange,
    nodeIdsWithinCCRange,
  }: {
    nodeIdsWithinXRange: Node[`id`][]
    nodeIdsWithinYRange: Node[`id`][]
    nodeIdsWithinCCRange: Node[`id`][] | typeof RENDER_ALL
  }): {
    smallest: SmallestNextVisibilityInput
    set0: NotSmallestNextVisibilityInput
    set1: NotSmallestNextVisibilityInput
  } {
    const xRange = {
      data: nodeIdsWithinXRange,
      name: `x`,
    }
    const yRange = {
      data: nodeIdsWithinYRange,
      name: `y`,
    }
    const ccRange = {
      data: nodeIdsWithinCCRange,
      name: `cc`,
    }
    const dataAscOrderedByLength = [
      {
        range: xRange,
        array: nodeIdsWithinXRange,
      },
      {
        range: yRange,
        array: nodeIdsWithinYRange,
      },
      {
        range: ccRange,
        array: nodeIdsWithinCCRange,
      },
    ].sort(
      ({ range: { data: data0 } }, { range: { data: data1 } }) =>
        data0.length - data1.length
    )
    const optimizedInputs = dataAscOrderedByLength.map(
      ({ range: { data, name }, array }, i) => {
        const renderAll = data === `RENDER_ALL`
        return {
          rank: i,
          data: i === 0 ? (renderAll ? [] : data) : new Set(data),
          name,
          renderAll,
          array,
        }
      }
    )

    return {
      smallest: optimizedInputs[0] as SmallestNextVisibilityInput,
      set0: optimizedInputs[1] as NotSmallestNextVisibilityInput,
      set1: optimizedInputs[2] as NotSmallestNextVisibilityInput,
    }
  }

  /**
   * Categorizes labels (nodes) into
   * 1. Now visible labels: any visible labels in the current screen.
   * 2. Now appearing labels: labels that did not exist but now must appear in the current screen
   * 3. Now disappearing labels: labels that existed in the screen but now must disappear
   */
  private processPreviousAndNextLabels({
    smallest,
    set0,
    set1,
    visibleNodesSet,
  }:
    | ReturnType<
        ConditionalNodeLabelsRenderer<N, L>[`optimizeNextLabelVisibilityInputs`]
      > & {
        visibleNodesSet: Set<string>
      }): {
    nowVisibleNodeIds: Node[`id`][]
    nowAppearingNodeIds: Node[`id`][]
    nowDisappearingNodes: NodeLabel<Node>[]
  } {
    const nowVisibleNodeIds: Node[`id`][] = []
    const nowAppearingNodeIds: Node[`id`][] = []
    const nowDisappearingNodes: NodeLabel<Node>[] = []

    if (smallest.renderAll) {
      // set0 is the second smallest array
      for (const nodeId of set0.array) {
        if (set1.data.has(nodeId)) {
          nowVisibleNodeIds.push(nodeId)
          if (!visibleNodesSet.has(nodeId)) {
            nowAppearingNodeIds.push(nodeId)
          }
        }
      }
    } else {
      for (const nodeId of smallest.data) {
        if (set0.data.has(nodeId) && set1.data.has(nodeId)) {
          nowVisibleNodeIds.push(nodeId)
          if (!visibleNodesSet.has(nodeId)) {
            nowAppearingNodeIds.push(nodeId)
          }
        }
      }
    }

    return {
      nowVisibleNodeIds,
      nowAppearingNodeIds,
      nowDisappearingNodes,
    }
  }

  private async getVisibleNodesSet() {
    const pksPromise = this.db!.visibleNodes.toCollection().primaryKeys()
    const pks = await pksPromise

    return new Set(pks)
  }

  private async deleteDisappearingLabels(visibleNodesSet: Set<Node[`id`]>) {
    const nowDisappearingNodes = []
    const renderLabelsWithCCAboveOrEqual = scaleToMinChildrenCount(
      this.viewport.scale.x
    )
    for (const [nodeId, label] of Object.entries(this.visibleLabelsMap)) {
      const cc = label.getNodeData().cc ?? 0
      if (!visibleNodesSet.has(nodeId) || cc < renderLabelsWithCCAboveOrEqual) {
        nowDisappearingNodes.push(label)
        delete this.visibleLabelsMap[nodeId]
      }
    }
    this.nodeLabelsContainer.removeChild(...nowDisappearingNodes)
  }

  /**
   * @returns
   * a promise of transaction that will resolve to an array of
   * 1) the nodes that must appear now
   * 2) the nodes that must disappear now,
   *
   * and a method to `cancel` the transaction.
   */
  private calculateNextLabelVisibility(visibleNodesSet: Set<string>) {
    const renderLabelsWithCCAboveOrEqual = scaleToMinChildrenCount(
      this.viewport.scale.x
    )
    const hitArea = this.viewport.hitArea
    if (!hitArea) return null
    // @ts-ignore: bad ts definition
    const xLow: number = hitArea.left
    // @ts-ignore
    const yLow: number = hitArea.top
    // @ts-ignore
    const xHigh: number = hitArea.right
    // @ts-ignore
    const yHigh: number = hitArea.bottom

    const { transaction, cancel } = this.db!.cancellableTx(
      `rw`,
      [this.db!.nodes, this.db!.visibleNodes],
      async () => {
        const [nodeIdsWithinXRange, nodeIdsWithinYRange, nodeIdsWithinCCRange] =
          await Promise.all([
            this.db!.nodes.where(`x`)
              .between(xLow, xHigh, true, true)
              .primaryKeys(),
            this.db!.nodes.where(`y`)
              .between(yLow, yHigh, true, true)
              .primaryKeys(),
            // there is no point of querying all primary keys if you get to render nodes in all cc's
            renderLabelsWithCCAboveOrEqual === 0
              ? RENDER_ALL
              : this.db!.nodes.where(`cc`)
                  .between(
                    renderLabelsWithCCAboveOrEqual,
                    Dexie.maxKey,
                    true,
                    true
                  )
                  .primaryKeys(),
          ])
        const nextLabelVisibilityInputs =
          this.optimizeNextLabelVisibilityInputs({
            nodeIdsWithinXRange,
            nodeIdsWithinYRange,
            nodeIdsWithinCCRange,
          })
        const { nowAppearingNodeIds, nowDisappearingNodes, nowVisibleNodeIds } =
          this.processPreviousAndNextLabels({
            ...nextLabelVisibilityInputs,
            visibleNodesSet,
          })
        return Promise.all([
          // Promise for the nodes that must appear now
          this.db!.nodes.bulkGet(nowAppearingNodeIds) as PromiseExtended<
            Node[]
          >,
          // Immediately resolved promise for the nodes that must disappear now
          nowDisappearingNodes,
          nowVisibleNodeIds,
        ])
      }
    )

    return {
      transaction,
      cancel,
    }
  }

  /**
   * make sure you still delete labels that go outside of the current screen
   * because you are moving around in a viewport
   */
  private async deleteLabelsOnDragging() {
    const nowDisappearingNodes = []
    const renderLabelsWithCCAboveOrEqual = scaleToMinChildrenCount(
      this.viewport.scale.x
    )
    const nowDisappearingNodeIds = []
    for (const [nodeId, label] of Object.entries(this.visibleLabelsMap)) {
      const cc = label.getNodeData().cc ?? 0
      if (
        !this.viewport.hitArea?.contains(label.x, label.y) ||
        cc < renderLabelsWithCCAboveOrEqual
      ) {
        nowDisappearingNodes.push(label)
        nowDisappearingNodeIds.push(nodeId)
        delete this.visibleLabelsMap[nodeId]
      }
    }
    this.nodeLabelsContainer.removeChild(...nowDisappearingNodes)
    await this.db!.visibleNodes.bulkDelete(nowDisappearingNodeIds)
  }

  /**
   * moved-end callback of `this.viewport`
   */
  private onMovedEnd = debounce(async () => {
    this.graphEventEmitter.emit(`startLabels`)
    const visibleNodesSet = await this.getVisibleNodesSet()
    const { transaction } = this.db!.cancellableTx(
      `rw`,
      [this.db!.nodes, this.db!.visibleNodes],
      async () => {
        const nextLabelVisibilityCalculation =
          this.calculateNextLabelVisibility(visibleNodesSet)
        if (!nextLabelVisibilityCalculation) return null
        const { transaction: nextLabelVisibilityTransaction } =
          nextLabelVisibilityCalculation
        const [nodesToAppear, nowDisappearingNodes, nowVisibleNodeIds] =
          await nextLabelVisibilityTransaction
        // Promise for updating currently visible nodes (returns nothing)
        const { transaction: visibleNodesTx } = this.db!.cancellableTx(
          `rw`,
          [this.db!.visibleNodes],
          async () => {
            // todo would using a plain Set() or object be faster than using a table?
            await this.db!.visibleNodes.clear()
            await this.db!.visibleNodes.bulkAdd(
              nowVisibleNodeIds.map((n) => ({
                id: n,
              }))
            )
          }
        )
        await visibleNodesTx

        return {
          nowDisappearingNodes,
          nodesToAppear,
        }
      }
    )
    const [[err, transactionResult]] = await Promise.all([
      to(transaction),
      this.deleteLabelsOnDragging(),
    ])

    if (!transactionResult || err) {
      this.graphEventEmitter.emit(`finishLabels`, [])
      return
    }
    const { nodesToAppear } = transactionResult
    this.deleteDisappearingLabels(visibleNodesSet)
    this.graphEventEmitter.emit(`finishLabels`, nodesToAppear as N[])
    this.createBitmapTextsAsNodeLabels(nodesToAppear)
  }, 100)

  /**
   * Just dump everything into the db
   */
  private async initDb(nodes: WithCoords<Node>[], links: LinkWithCoords[]) {
    await this.db!.delete().then(() => this.db!.open())
    const n = nodes.map(({ cc, ...rest }) => ({
      cc: cc ?? 0,
      ...rest,
    }))
    await this.db!.transaction(
      `rw`,
      [this.db!.nodes, this.db!.links],
      async () => {
        return Promise.all([
          this.db!.links.bulkAdd(links),
          this.db!.nodes.bulkAdd(n),
        ])
      }
    )
    this.eventTarget.dispatchEvent(new Event(GraphEvents.FINISH_DB))
  }

  /**
   * moved-end event includes zoom, drag, ... everything.
   */
  private async initMovedEndListener() {
    this.viewport.on(`moved-end`, () => {
      if (this.initComplete) {
        this.onMovedEnd()
      }
    })
  }

  /**
   * Creates visual labels (texts) from the titles of nodes
   * @param nodes - nodes with titles
   */
  private createBitmapTextsAsNodeLabels(nodes: WithPartialCoords<Node>[]) {
    const labels: NodeLabel<Node>[] = []

    for (const node of nodes) {
      if (
        node.title === undefined ||
        node.x === undefined ||
        node.y === undefined
      )
        continue
      const text = NodeLabelHelper.createNodeLabel(
        node.title,
        node as WithCoords<Node>
      )
      text.x = node.x
      text.y = node.y
      text.alpha = 0.7
      text.zIndex = 200
      labels.push(text)
      this.visibleLabelsMap[node.id] = text
    }
    if (labels.length > 0) this.nodeLabelsContainer.addChild(...labels)
  }
}
