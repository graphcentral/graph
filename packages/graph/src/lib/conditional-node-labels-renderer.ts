import { MovedEventType, Viewport } from "pixi-viewport"
import { Container, ParticleContainer } from "pixi.js"
import debounce from "lodash.debounce"
import {
  LinkWithCoords,
  Node,
  NotSmallestNextVisibilityInput,
  SmallestNextVisibilityInput,
  WithCoords,
  WithPartialCoords,
} from "./types"
import { GraphEvents, GraphScales, RENDER_ALL } from "./graph-enums"
import { NodeLabel } from "./node-label"
import { KnowledgeGraphDb } from "./db"
import Dexie, { PromiseExtended } from "dexie"

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
export class ConditionalNodeLabelsRenderer {
  /**
   * Viewport of the application.
   */
  private viewport: Viewport
  /**
   * Container that stores all labels.
   */
  private nodeLabelsContainer = new Container()
  private db = new KnowledgeGraphDb()
  private visibleLabelsMap: Record<Node[`id`], NodeLabel<Node>> = {}
  private eventTarget = new EventTarget()
  private initComplete = false

  constructor(
    viewport: Viewport,
    nodes: WithCoords<Node>[],
    links: LinkWithCoords[],
    /**
     * Optional db instantiated from outside of the class
     */
    db?: KnowledgeGraphDb
  ) {
    this.viewport = viewport
    this.viewport.addChild(this.nodeLabelsContainer)
    this.initDb(nodes, links)
    this.db = db ?? this.db
    this.initMovedEndListener()
  }

  public onInitComplete(cb: (...params: any[]) => any) {
    this.eventTarget.addEventListener(
      GraphEvents.INIT_DB_COMPLETE,
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
    visibleNodes,
  }: {
    nodeIdsWithinXRange: Node[`id`][]
    nodeIdsWithinYRange: Node[`id`][]
    nodeIdsWithinCCRange: Node[`id`][] | typeof RENDER_ALL
    visibleNodes: Node[`id`][]
  }): {
    smallest: SmallestNextVisibilityInput
    set0: NotSmallestNextVisibilityInput
    set1: NotSmallestNextVisibilityInput
    visibleNodesSet: Set<string>
  } {
    const visibleNodesSet = new Set(visibleNodes)
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

    console.log(optimizedInputs)

    return {
      smallest: optimizedInputs[0] as SmallestNextVisibilityInput,
      set0: optimizedInputs[1] as NotSmallestNextVisibilityInput,
      set1: optimizedInputs[2] as NotSmallestNextVisibilityInput,
      visibleNodesSet,
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
  }: ReturnType<
    ConditionalNodeLabelsRenderer[`optimizeNextLabelVisibilityInputs`]
  >): {
    nowVisibleNodeIds: Node[`id`][]
    nowAppearingNodeIds: Node[`id`][]
    nowDisappearingNodes: NodeLabel<Node<string>>[]
  } {
    const nowVisibleNodeIds: Node[`id`][] = []
    const nowAppearingNodeIds: Node[`id`][] = []
    const nowDisappearingNodes: NodeLabel<Node<string>>[] = []

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

    for (const [nodeId, label] of Object.entries(this.visibleLabelsMap)) {
      if (!visibleNodesSet.has(nodeId)) {
        nowDisappearingNodes.push(label)
        delete this.visibleLabelsMap[nodeId]
      }
    }

    return {
      nowVisibleNodeIds,
      nowAppearingNodeIds,
      nowDisappearingNodes,
    }
  }

  /**
   * @returns
   * a promise of transaction that will resolve to an array of
   * 1) the nodes that must appear now
   * 2) the nodes that must disappear now,
   *
   * and a method to `cancel` the transaction.
   */
  private calculateNextLabelVisibility() {
    const renderLabelsWithCCAboveOrEqual = this.scaleToMinChildrenCount(
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

    const { transaction, cancel } = this.db.cancellableTx(
      `rw`,
      [this.db.nodes, this.db.visibleNodes],
      async () => {
        const [
          nodeIdsWithinXRange,
          nodeIdsWithinYRange,
          nodeIdsWithinCCRange,
          visibleNodes,
        ] = await Promise.all([
          this.db.nodes
            .where(`x`)
            .between(xLow, xHigh, true, true)
            .primaryKeys(),
          this.db.nodes
            .where(`y`)
            .between(yLow, yHigh, true, true)
            .primaryKeys(),
          // there is no point of querying all primary keys if you get to render nodes in all cc's
          renderLabelsWithCCAboveOrEqual === 0
            ? RENDER_ALL
            : this.db.nodes
                .where(`cc`)
                .between(
                  renderLabelsWithCCAboveOrEqual,
                  Dexie.maxKey,
                  true,
                  true
                )
                .primaryKeys(),
          this.db.visibleNodes.toCollection().primaryKeys(),
        ])
        const nextLabelVisibilityInputs =
          this.optimizeNextLabelVisibilityInputs({
            nodeIdsWithinXRange,
            nodeIdsWithinYRange,
            nodeIdsWithinCCRange,
            visibleNodes,
          })
        const { nowAppearingNodeIds, nowDisappearingNodes, nowVisibleNodeIds } =
          this.processPreviousAndNextLabels(nextLabelVisibilityInputs)
        return Promise.all([
          // Promise for the nodes that must appear now
          this.db.nodes.bulkGet(nowAppearingNodeIds) as PromiseExtended<Node[]>,
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
   * For the transaction with large number of nodes,
   * it is possible that the transaction may end up being called concurrently
   * if the user moves around in the screen frequently in a short duration of time.
   *
   * Then this must be called to cancel the previous transaction
   */
  private cancelFns: VoidFunction[] = []
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onMovedEnd = debounce(async (_movedEndEvent: MovedEventType) => {
    this.cancelFns.forEach((fn) => fn())
    this.cancelFns = []

    const { transaction, cancel } = await this.db.cancellableTx(
      `rw`,
      [this.db.nodes, this.db.visibleNodes],
      async () => {
        const nextLabelVisibilityCalculation =
          this.calculateNextLabelVisibility()
        if (!nextLabelVisibilityCalculation) return null
        const { transaction: nextLabelVisibilityTransaction } =
          nextLabelVisibilityCalculation
        const [nodesToAppear, nowDisappearingNodes, nowVisibleNodeIds] =
          await nextLabelVisibilityTransaction
        // Promise for updating currently visible nodes (returns nothing)
        const { transaction: visibleNodesTransaction } = this.db.cancellableTx(
          `rw`,
          [this.db.visibleNodes],
          async () => {
            // todo would using a plain Set() or object be faster than using a table?
            await this.db.visibleNodes.clear()
            await this.db.visibleNodes.bulkAdd(
              nowVisibleNodeIds.map((n) => ({
                id: n,
              }))
            )
          }
        )
        await visibleNodesTransaction

        return {
          nowDisappearingNodes,
          nodesToAppear,
        }
      }
    )
    this.cancelFns.push(cancel)
    const transactionResult = await transaction
    if (!transactionResult) return
    const { nowDisappearingNodes, nodesToAppear } = transactionResult
    this.nodeLabelsContainer.removeChild(...nowDisappearingNodes)
    this.createBitmapTextsAsNodeLabels(nodesToAppear)
  }, 100)

  /**
   * Just dump everything into the db
   */
  private async initDb(nodes: WithCoords<Node>[], links: LinkWithCoords[]) {
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
    console.log(`DB INIT COMPLETE`)
    this.eventTarget.dispatchEvent(new Event(GraphEvents.INIT_DB_COMPLETE))
  }

  /**
   * moved-end event includes zoom, drag, ... everything.
   */
  private async initMovedEndListener() {
    this.viewport.on(
      // @ts-ignore
      `moved-end`,
      (movedEndEvent: MovedEventType) => {
        if (this.initComplete) {
          this.onMovedEnd(movedEndEvent)
        }
      }
    )
  }

  /**
   * Matches the current scale with appropriate minimum children count
   * Used to calculate which labels must appear based on current scale.
   * i.e. if zoomed out too much, you should probably see labels of nodes with
   * large children count (`cc`).
   * @param scale decreases as user zooms out
   */
  private scaleToMinChildrenCount(scale: number): number {
    switch (true) {
      // invalid case
      case scale <= 0: {
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
      default: {
        return -1
      }
    }
  }

  /**
   * Creates visual labels (texts) from the titles of nodes
   * @param nodes - nodes with titles
   */
  private createBitmapTextsAsNodeLabels(nodes: WithPartialCoords<Node>[]) {
    const labels: NodeLabel<Node>[] = []

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
      this.visibleLabelsMap[node.id] = text
    }
    if (labels.length > 0) this.nodeLabelsContainer.addChild(...labels)
  }
}
