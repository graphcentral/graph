import to from "await-to-js"
import type { NotionAPI } from "notion-client"
import { ErrorObject } from "serialize-error"
import { toEnhanced } from "../lib/global-util"
import { RequestQueue } from "../lib/request-queue"
import { separateIdWithDashSafe } from "../official/notion-util"
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
  private nodes: NotionContentNodeUnofficialAPI[] = []
  private nodesGraph =
    new UndirectedNodesGraph<NotionContentNodeUnofficialAPI>()

  constructor(unofficialNotionAPI: NotionAPI) {
    this.unofficialNotionAPI = unofficialNotionAPI
  }

  /**
   *
   * @param blockId plain block id not separated by dash
   * @returns
   */

  private accumulateError(err: ErrorObject | Error) {
    this.errors.push(err)
  }

  public async getGraphFromRootBlock(rootBlockId: string): Promise<{
    nodes: NotionContentNodeUnofficialAPI[]
    links: ReturnType<
      UndirectedNodesGraph<NotionContentNodeUnofficialAPI>[`getD3JsEdgeFormat`]
    >
    errors: (ErrorObject | Error)[]
  }> {
    const requestQueue = new RequestQueue<any, Error>({
      maxConcurrentRequest: 3,
    })
    // check the root block
    // and if it is inaccessible, just return right away
    const [err, page] = await toEnhanced(
      this.unofficialNotionAPI.getBlocks([separateIdWithDashSafe(rootBlockId)])
    )
    if (err) this.accumulateError(err)
    if (!page) {
      return {
        nodes: this.nodes,
        links: [],
        errors: this.errors,
      }
    }

    const blockFromResponse =
      page.recordMap.block[separateIdWithDashSafe(rootBlockId)]
    const title =
      UnofficialNotionAPIUtil.getTitleFromPageBlock(blockFromResponse)

    const rootBlockType = blockFromResponse.value.type
    if (!isNotionContentNodeType(rootBlockType)) {
      return {
        nodes: this.nodes,
        links: [],
        errors: this.errors,
      }
    }

    const rootNode: NotionContentNodeUnofficialAPI = {
      title,
      id: rootBlockId,
      type: rootBlockType,
    }

    const recursivelyDiscoverBlocks = async (
      parentNode: NotionContentNodeUnofficialAPI
    ) => {
      const [err, page] = await toEnhanced(
        this.unofficialNotionAPI.getPage(parentNode.id)
      )
      if (err) this.accumulateError(err)
      if (!page) return

      console.log(`@@@@@@@@@@@ parentNode: ${JSON.stringify(parentNode)}`)
      console.log(JSON.stringify(page.block, null, 2))

      // for (const selfOrChildBlockId of Object.keys(page.block)) {
      //   const childBlockType = page.block[selfOrChildBlockId].value.type
      //   const childBlock = page.block[selfOrChildBlockId]
      //   if (!isNotionContentNodeType(childBlockType)) continue

      //   if (selfOrChildBlockId === separateIdWithDashSafe(parentNode.id)) {
      //     continue
      //   }
      //   const childBlockId = selfOrChildBlockId

      //   switch (childBlockType) {
      //     case `alias`: {
      //       // this.nodesGraph.addEdge()
      //       break
      //     }
      //     case `collection_view`: {
      //       break
      //     }
      //     case `collection_view_page`: {
      //       break
      //     }
      //     case `page`: {
      //       const title =
      //         UnofficialNotionAPIUtil.getTitleFromPageBlock(childBlock)
      //       const childNode: NotionContentNodeUnofficialAPI = {
      //         title,
      //         id: childBlockId,
      //         type: `page`,
      //       }
      //       this.nodes.push(childNode)
      //       this.nodesGraph.addEdge(parentNode, childNode)
      //       requestQueue.enqueue(() => recursivelyDiscoverBlocks(childNode))
      //       break
      //     }
      //   }
      // }
    }

    const result = await Promise.allSettled([
      recursivelyDiscoverBlocks(rootNode),
      new Promise((resolve) => requestQueue.onComplete(resolve)),
    ])

    return {
      nodes: this.nodes,
      links: this.nodesGraph.getD3JsEdgeFormat(),
      errors: this.errors,
    }
  }
}
