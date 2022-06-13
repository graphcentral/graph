import to from "await-to-js"
import type { NotionAPI } from "notion-client"
import { ErrorObject } from "serialize-error"
import { Errors } from "../errors"
import { debugObject, toEnhanced } from "../lib/global-util"
import { RequestQueue } from "../lib/request-queue"
import { separateIdWithDashSafe } from "../official/notion-util"
import { Block, BlockMap } from "../types/block-map"
import { UndirectedNodesGraph } from "../types/nodes-graph"
import {
  isNotionContentNodeType,
  NotionContentNode,
  NotionContentNodeUnofficialAPI,
} from "../types/notion-content-node"
import { UnofficialNotionAPIUtil } from "./util"

/**
 * Graph of notion blocks.
 *
 * Does a lot of async calls,
 * so it's possible that async error occurs anywhere.
 *
 * The key to handling the error is how we approach the UX in the frontend
 * regarding the error. What will we do for the user when we encounter an error?
 *
 * Case 1: Some of the blocks are missing, but it's still viewable by the user. Then still include the errors and error messages from the server, but show the contents
 * Case 2: All blocks are missing (ex. internet not working for some reason from the server). Then send a complete error, possibly with a helpful if message if any
 */
export class NotionGraph {
  private unofficialNotionAPI: NotionAPI
  private errors: (ErrorObject | Error)[] = []
  private nodes: Record<
    NotionContentNodeUnofficialAPI[`id`],
    NotionContentNodeUnofficialAPI
  > = {}
  private nodesGraph =
    new UndirectedNodesGraph<NotionContentNodeUnofficialAPI>()

  constructor(unofficialNotionAPI: NotionAPI) {
    this.unofficialNotionAPI = unofficialNotionAPI
  }

  private accumulateError(err: ErrorObject | Error) {
    this.errors.push(err)
  }

  /**
   * Finds the topmost block from any block id.
   * Notion API is structured in a way that any call to a getPage
   * would return its recursive parents in its response.
   * The last recursive parent will be the topmost block.
   * @param blockIdWithoutDash
   * @returns `null` if an error happens or nothing is found
   * @throws nothing
   */
  private async findTopmostBlock(
    blockIdWithoutDash: string
  ): Promise<null | BlockMap[keyof BlockMap]> {
    const [err, page] = await toEnhanced(
      this.unofficialNotionAPI.getPage(blockIdWithoutDash)
    )

    if (err || !page) {
      if (err) {
        this.errors.push(err)
        this.errors.push(new Error(Errors.NKG_0000(blockIdWithoutDash)))
      }
      return null
    }

    const topmostBlock = Object.values(page.block).find((b) =>
      UnofficialNotionAPIUtil.isBlockToplevelPageOrCollectionViewPage(b)
    )

    if (!topmostBlock) {
      this.errors.push(new Error(Errors.NKG_0000(blockIdWithoutDash)))
      return null
    }

    return topmostBlock
  }

  private addCollectionViewTitleInNextRecursiveCall(
    page: Awaited<ReturnType<NotionAPI[`getPageRaw`]>>,
    parentNode: NotionContentNodeUnofficialAPI
  ) {
    if (parentNode.type !== `collection_view`) return

    const blocks = page.recordMap.block
    const collection = page.recordMap.collection
    // this contains the id of the 'collection' (not 'collection_view')
    // 'collection' contains the name of the database, which is what we want
    const collectionViewBlock = blocks[parentNode.id]
    // use this to get the collection (database) title
    const collectionId: string | undefined =
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      collectionViewBlock.value.collection_id
    // extra careful output typing
    if (!collection)
      this.accumulateError(new Error(Errors.NKG_0003(`collection`)))
    if (!collectionId)
      this.accumulateError(new Error(Errors.NKG_0003(`collectionId`)))
    if (!collectionViewBlock)
      this.accumulateError(new Error(Errors.NKG_0003(`collectionViewBlock`)))
    if (collectionId && collection && !(collectionId in collection)) {
      this.accumulateError(new Error(Errors.NKG_0004(collectionId)))
    }

    if (
      collection &&
      collectionId &&
      collectionViewBlock &&
      collectionId in collection
    ) {
      // {
      //  ...
      //  "collection": {
      //   "58e7440f-fad4-4a30-9de3-2dc5f5673b62": {
      //     "role": "reader",
      //     "value": {
      //       "id": "58e7440f-fad4-4a30-9de3-2dc5f5673b62",
      //       "version": 14,
      //       "name": [
      //         [
      //           "Database-test"
      //         ]
      //       ],
      // @ts-ignore: wrong library typing
      const collectionBlock: Block = collection[collectionId]
      const title =
        UnofficialNotionAPIUtil.getTitleFromCollectionBlock(collectionBlock)
      // just being extra careful
      if (parentNode.id in this.nodes) {
        this.nodes[parentNode.id].title = title
      }
    }
  }

  private getPagesFromCollectionView(
    page: Awaited<ReturnType<NotionAPI[`getPageRaw`]>>,
    parentNode: NotionContentNodeUnofficialAPI
  ) {
    if (parentNode.type !== `collection_view`) return

    const blocks = page.recordMap.block
    // 'collection_view' contains ids of the pages inside it, if any
    const collection_view = page.recordMap.collection_view

    // collectionView != realCollectionView. They have different ids
    const collectionViewBlock = blocks[parentNode.id]
  }

  public async getGraphFromRootBlock(rootBlockId: string): Promise<{
    nodes: Record<
      NotionContentNodeUnofficialAPI[`id`],
      NotionContentNodeUnofficialAPI
    >
    links: ReturnType<
      UndirectedNodesGraph<NotionContentNodeUnofficialAPI>[`getD3JsEdgeFormat`]
    >
    errors: (ErrorObject | Error)[]
  }> {
    const defaultReturn = {
      links: [],
      nodes: this.nodes,
      errors: this.errors,
    }
    const requestQueue = new RequestQueue<any, Error>({
      maxConcurrentRequest: 3,
    })

    const topMostBlock = await this.findTopmostBlock(rootBlockId)

    if (!topMostBlock) {
      return defaultReturn
    }

    const rootBlockNode =
      UnofficialNotionAPIUtil.extractTypeUnsafeNotionContentNodeFromBlock(
        topMostBlock
      )
    if (!isNotionContentNodeType(rootBlockNode.type)) {
      this.errors.push(new Error(Errors.NKG_0001(topMostBlock)))
      return defaultReturn
    }

    const rootBlockNodeNarrowedType = rootBlockNode.type

    const recursivelyDiscoverBlocks = async (
      parentNode: NotionContentNodeUnofficialAPI
    ) => {
      const [err, page] = await toEnhanced(
        this.unofficialNotionAPI.getPageRaw(parentNode.id)
      )
      if (err) this.accumulateError(err)
      if (!page) return

      // if the parent node was collection_view,
      // the response must contain `collection` and `collection_view` keys
      if (parentNode.type === `collection_view`) {
        this.addCollectionViewTitleInNextRecursiveCall(page, parentNode)
      }

      for (const selfOrChildBlockId of Object.keys(page.recordMap.block)) {
        const childBlockType =
          page.recordMap.block[selfOrChildBlockId].value.type
        const childBlock = page.recordMap.block[selfOrChildBlockId]
        console.log(`${childBlockType}`)
        if (!isNotionContentNodeType(childBlockType)) continue
        if (
          selfOrChildBlockId === separateIdWithDashSafe(parentNode.id) ||
          selfOrChildBlockId in this.nodes
        ) {
          continue
        }
        const childBlockId = selfOrChildBlockId

        switch (childBlockType) {
          case `alias`: {
            // this.nodesGraph.addEdge()
            break
          }
          case `collection_view`: {
            // console.log(JSON.stringify(childBlock, null, 2))
            // // be extra careful on unsafe type operations
            // const collectionId: string | undefined =
            //   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //   // @ts-ignore
            //   childBlock.value.collection_id
            // const collectionViewId: string | undefined =
            //   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //   // @ts-ignore
            //   childBlock.value.view_ids?.[0]

            // if (!collectionId || !collectionViewId) {
            //   this.accumulateError(new Error(Errors.NKG_0002(childBlock)))
            //   break
            // }
            // console.log(JSON.stringify(childBlock, null, 2))
            // const requestCollectionData = async () => {
            //   const [err, collectionData] = await toEnhanced(
            //     this.unofficialNotionAPI.getCollectionData(
            //       collectionId,
            //       collectionViewId,
            //       childBlock
            //     )
            //   )
            //   const [err2, collectionData2] = await toEnhanced(
            //     this.unofficialNotionAPI.getPage(childBlock.value.id)
            //   )
            //   if (err || !collectionData) {
            //     if (err) this.accumulateError(err)
            //     return null
            //   }
            //   if (!collectionData) return null
            //   console.log(`@@@@@@@@@@@@@@@@@collectionData`)
            //   console.log(collectionData)
            //   console.log(`@@@@@@@@@@@@@@@@@collectionData`)
            //   console.log(`@@@@@@@@@@@@@@@@@collectionData222`)
            //   console.log(JSON.stringify(collectionData2, null, 2))
            //   console.log(`@@@@@@@@@@@@@@@@@collectionData222`)
            // }
            const childNode: NotionContentNodeUnofficialAPI = {
              // title will be known in the next request
              title: `Unknown database title`,
              id: childBlockId,
              type: childBlockType,
            }
            this.nodes[childNode.id] = childNode
            this.nodesGraph.addEdge(childNode, parentNode)
            requestQueue.enqueue(() => recursivelyDiscoverBlocks(childNode))
            break
          }
          case `collection_view_page`: {
            break
          }
          case `page`: {
            const typeSafeChildNode = {
              ...UnofficialNotionAPIUtil.extractTypeUnsafeNotionContentNodeFromBlock(
                childBlock
              ),
              type: childBlockType,
            }
            this.nodes[typeSafeChildNode.id] = typeSafeChildNode
            this.nodesGraph.addEdge(typeSafeChildNode, parentNode)
            requestQueue.enqueue(() =>
              recursivelyDiscoverBlocks(typeSafeChildNode)
            )
            break
          }
        }
      }
    }

    const typeSafeRootBlockNode = {
      ...rootBlockNode,
      type: rootBlockNodeNarrowedType,
    }
    this.nodes[typeSafeRootBlockNode.id] = typeSafeRootBlockNode
    const result = await toEnhanced(
      Promise.allSettled([
        recursivelyDiscoverBlocks(typeSafeRootBlockNode),
        new Promise((resolve) => requestQueue.onComplete(resolve)),
      ])
    )

    console.log(JSON.stringify(this.nodes, null, 2))
    console.log(this.errors)

    return {
      nodes: this.nodes,
      links: this.nodesGraph.getD3JsEdgeFormat(),
      errors: this.errors,
    }
  }
}
