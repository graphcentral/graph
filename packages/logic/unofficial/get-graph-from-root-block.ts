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
    page: Awaited<ReturnType<NotionAPI[`getPage`]>>,
    parentNode: NotionContentNodeUnofficialAPI
  ) {
    if (
      parentNode.type !== `collection_view` &&
      parentNode.type !== `collection_view_page`
    )
      return

    const blocks = page.block
    const collection = page.collection
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
    const rootBlockSpaceId = topMostBlock.value.space_id
    if (!isNotionContentNodeType(rootBlockNode.type)) {
      this.errors.push(new Error(Errors.NKG_0001(topMostBlock)))
      return defaultReturn
    }

    const rootBlockNodeNarrowedType = rootBlockNode.type

    const recursivelyDiscoverBlocks = async (
      parentNode: NotionContentNodeUnofficialAPI
    ) => {
      const [err, page] = await toEnhanced(
        // getPageRaw must NOT be used
        this.unofficialNotionAPI.getPage(parentNode.id)
      )
      if (err) this.accumulateError(err)
      if (!page) return

      // if the parent node was collection_view,
      // the response must contain `collection` and `collection_view` keys
      if (
        parentNode.type === `collection_view` ||
        parentNode.type === `collection_view_page`
      ) {
        this.addCollectionViewTitleInNextRecursiveCall(page, parentNode)
      }

      for (const selfOrChildBlockId of Object.keys(page.block)) {
        const childBlockType = page.block[selfOrChildBlockId].value.type
        const childBlock = page.block[selfOrChildBlockId]
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
            const aliasedBlockId = childBlock.value?.format?.alias_pointer?.id
            const aliasedBlockSpaceId =
              childBlock.value?.format?.alias_pointer?.spaceId
            if (aliasedBlockId) {
              this.nodesGraph.addEdgeByIds(parentNode.id, aliasedBlockId)
              // if aliased block id is in another space,
              // need to request that block separately
              // because it is not going to be discovered
              if (aliasedBlockSpaceId !== rootBlockSpaceId) {
                // @todo
              }
            } else {
              this.errors.push(new Error(Errors.NKG_0005(childBlock)))
            }
            break
          }
          case `collection_view`: {
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
            const childNode: NotionContentNodeUnofficialAPI = {
              // title will be known in the next request
              title: `Unknown database page title`,
              id: childBlockId,
              collection_id:
                // @ts-ignore
                childBlock.value.collection_id,
              type: childBlockType,
            }
            this.nodes[childNode.id] = childNode
            this.nodesGraph.addEdge(childNode, parentNode)
            requestQueue.enqueue(() => recursivelyDiscoverBlocks(childNode))
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
    // @ts-ignore: todo fix this (the topmost block can be a collection_view_page)
    this.nodes[typeSafeRootBlockNode.id] = typeSafeRootBlockNode
    const result = await toEnhanced(
      Promise.allSettled([
        // @ts-ignore: todo fix this (the topmost block can be a collection_view_page)
        recursivelyDiscoverBlocks(typeSafeRootBlockNode),
        new Promise((resolve) => requestQueue.onComplete(resolve)),
      ])
    )

    return {
      nodes: this.nodes,
      links: this.nodesGraph.getD3JsEdgeFormat(),
      errors: this.errors,
    }
  }
}
