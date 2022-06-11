/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Client } from "@notionhq/client"
import to from "await-to-js"
import { RequestQueue } from "./request-queue"
import { NotionContentNode } from "./types/child-info"
import { separateIdWithDashSafe, identifyObjectTitle } from "./util"

function blockTypeToNotionContentNodeType(
  blockType: `child_page` | `child_database`
) {
  switch (blockType) {
    case `child_database`:
      return `database`
    case `child_page`:
      return `page`
    default:
      return `error`
  }
}

/**
 *
 * @param notion notion client
 * @param rootBlockId the id of a root page or database
 * @returns `null` on error. Otherwise `database` or `page`
 */
async function retrieveRootNode(
  notion: Client,
  rootBlockId: NotionContentNode[`id`]
): Promise<NotionContentNode | null> {
  const [err, blockInfo] = await to(
    notion.blocks.retrieve({
      block_id: separateIdWithDashSafe(rootBlockId),
    })
  )

  if (err || !blockInfo) {
    return null
  }

  return {
    type: blockTypeToNotionContentNodeType(
      // @ts-ignore: sdk bad typing
      blockInfo.type
    ),
    id: separateIdWithDashSafe(rootBlockId),
    title: identifyObjectTitle(blockInfo),
  }
}

/**
 * Notion API currently does not support getting all children of a page at once
 * so the only way is to recursively extract all pages and databases from a page
 * @param notion Notion client
 * @param rootBlockId the id of the root page or database.
 * Either format of 1429989fe8ac4effbc8f57f56486db54 or
 * 1429989f-e8ac-4eff-bc8f-57f56486db54 are all fine.
 * @returns all recurisvely discovered children of the root page
 */
export async function collectAllChildren(
  notion: Client,
  rootBlockId: string
): Promise<NotionContentNode[]> {
  const rootNode = await retrieveRootNode(notion, rootBlockId)

  if (!rootNode) {
    throw new Error(`Error while retrieving rootNode`)
  }
  const nodes: NotionContentNode[] = [rootNode]
  const nodesGraph: Record<
    NotionContentNode[`id`],
    Record<NotionContentNode[`id`], boolean>
  > = {}
  const requestQueue = new RequestQueue({ maxConcurrentRequest: 3 })

  async function retrieveNodesRecursively(parentNode: NotionContentNode) {
    let blockChildren: Awaited<
      ReturnType<typeof notion[`blocks`][`children`][`list`]>
    > | null = null
    let databaseChildren: Awaited<
      ReturnType<typeof notion[`databases`][`query`]>
    > | null = null
    switch (parentNode.type) {
      case `database`: {
        const [err, databaseChildrenQueryResult] = await to(
          notion.databases.query({
            database_id: separateIdWithDashSafe(parentNode.id),
            page_size: 50,
          })
        )
        if (databaseChildrenQueryResult) {
          databaseChildren = databaseChildrenQueryResult
        }
        if (err) console.log(err)
        break
      }
      case `page`: {
        const [err, blockChildrenListResult] = await to(
          notion.blocks.children.list({
            block_id: separateIdWithDashSafe(parentNode.id),
            page_size: 50,
          })
        )
        if (blockChildrenListResult) {
          blockChildren = blockChildrenListResult
        }
        if (err) console.log(err)
      }
    }
    const queryChild = (child: NotionContentNode) => {
      switch (child.type) {
        case `page`: {
          requestQueue.enqueue(() => retrieveNodesRecursively(child))
          break
        }
        case `database`: {
          requestQueue.enqueue(() => retrieveNodesRecursively(child))
          break
        }
      }
    }
    if (blockChildren) {
      for (const child of blockChildren.results) {
        try {
          // @ts-ignore: sdk doesn't support good typing
          if (child.type === `child_database` || child.type === `child_page`) {
            const newBlock: NotionContentNode = {
              title: identifyObjectTitle(child),
              id: child.id,
              // @ts-ignore: sdk doesn't support good typing
              type: blockTypeToNotionContentNodeType(
                // @ts-ignore: sdk doesn't support good typing
                child.type
              ),
              parent: parentNode,
            }
            nodes.push(newBlock)
            queryChild(newBlock)
          }
        } catch (e) {
          console.log(e)
          console.log(`e`)
        }
      }
    } else if (databaseChildren) {
      for (const child of databaseChildren.results) {
        try {
          const newBlock: NotionContentNode = {
            title: identifyObjectTitle(child),
            id: child.id,
            type: child.object,
            parent: parentNode,
          }
          nodes.push(newBlock)
          queryChild(newBlock)
        } catch (e) {
          console.log(e)
          console.log(`e`)
        }
      }
    }
  }

  const [err] = await to(
    Promise.allSettled([
      retrieveNodesRecursively(rootNode),
      new Promise((resolve) => {
        requestQueue.onComplete(resolve)
      }),
    ])
  )

  if (err) {
    throw err
  }

  return nodes
}
