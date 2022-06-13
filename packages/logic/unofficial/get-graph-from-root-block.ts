import to from "await-to-js"
import type { NotionAPI } from "notion-client"
import { ErrorObject } from "serialize-error"
import { toEnhanced } from "../lib/global-util"
import { separateIdWithDashSafe } from "../official/notion-util"
import { UndirectedNodesGraph } from "../types/nodes-graph"
import { NotionContentNodeUnofficialAPI } from "../types/notion-content-node"
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
  private links: ReturnType<
    UndirectedNodesGraph<NotionContentNodeUnofficialAPI>[`getD3JsEdgeFormat`]
  > = []
  private nodesGraph =
    new UndirectedNodesGraph<NotionContentNodeUnofficialAPI>()

  constructor(unofficialNotionAPI: NotionAPI) {
    this.unofficialNotionAPI = unofficialNotionAPI
  }

  private async recursivelyDiscoverBlocks(blockId: string) {
    const [err, page] = await toEnhanced(
      this.unofficialNotionAPI.getPage(blockId)
    )
    if (err) this.accumulateError(err)
    if (!page) return

    for (const selfOrChildBlockId of Object.keys(page.block)) {
      const childBlockType = page.block[selfOrChildBlockId].value.type
      if (
        childBlockType !== `page` &&
        childBlockType !== `collection_view` &&
        childBlockType !== `collection_view_page` &&
        childBlockType !== `alias`
      )
        continue

      // the block itself
      if (selfOrChildBlockId === blockId) {
        this.nodes.push({
          id: blockId,
          type: childBlockType,
          title: UnofficialNotionAPIUtil.getTitleFromPageBlock(
            page.block[selfOrChildBlockId]
          ),
        })

        continue
      }

      switch (childBlockType) {
        case `alias`: {
          // this.nodesGraph.addEdge()
          break
        }
        case `collection_view`: {
          break
        }
        case `collection_view_page`: {
          break
        }
        case `page`: {
          break
        }
      }
    }
  }

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
    // check the root block
    // and if it is inaccessible, just return right away
    const [err, page] = await toEnhanced(
      this.unofficialNotionAPI.getBlocks([separateIdWithDashSafe(rootBlockId)])
    )
    console.log(JSON.stringify(page, null, 2))
    if (err) this.accumulateError(err)
    if (!page) {
      return {
        nodes: this.nodes,
        links: this.links,
        errors: this.errors,
      }
    }

    return {
      nodes: this.nodes,
      links: this.links,
      errors: this.errors,
    }
  }
}
