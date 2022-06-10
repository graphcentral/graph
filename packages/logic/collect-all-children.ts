import { Client } from "@notionhq/client"
import to from "await-to-js"
import { RequestQueue } from "./request-queue"
import { ChildInfo } from './types/child-info';
import { separateIdWithDashSafe, identifyObjectTitle, nameUntitledIfEmpty } from "./util"

export async function collectAllChildren(
  notion: Client,
  rootPageId: string
): Promise<ChildInfo[]> {
  const blocks: ChildInfo[] = [
    {
      title: `Root`,
      id: separateIdWithDashSafe(rootPageId),
      type: `page`,
    },
  ]
  const requestQueue = new RequestQueue({ maxConcurrentRequest: 3 })

  async function retrieveBlocksRecurisvely(
    {
      id,
      title,
      type
    }: ChildInfo
  ) {
    let blockChildren: Awaited<
      ReturnType<typeof notion[`blocks`][`children`][`list`]>
    > | null = null
    let databaseChildren: Awaited<
      ReturnType<typeof notion[`databases`][`query`]>
    > | null = null
    switch (type) {
      case `database`: {
        const [err, databaseChildrenQueryResult] = await to(notion.databases.query({
          database_id: separateIdWithDashSafe(id),
          page_size: 50,
        }))
        if (databaseChildrenQueryResult) {
          databaseChildren = databaseChildrenQueryResult
        }
        if (err) console.log(err)
        break
      }
      case `page`: {
        const [err, blockChildrenListResult] = await to(notion.blocks.children.list({
          block_id: separateIdWithDashSafe(id),
          page_size: 50,
        }))
        if (blockChildrenListResult) {
          blockChildren = blockChildrenListResult
        }
        if (err) console.log(err)
      }
    }
    const queryChild = (child: ChildInfo) => {
      // @ts-ignore
      switch (child.type) {
        case `page`: {
          requestQueue.enqueue(() =>
            retrieveBlocksRecurisvely(child)
          )
          break
        }
        case `database`: {
          requestQueue.enqueue(() =>
            retrieveBlocksRecurisvely(child)
          )
          break
        }
      }
    }
    if (blockChildren) {
      for (const child of blockChildren.results) {
        try {
          // @ts-ignore
          if (child.type === `child_database` || child.type === `child_page`) {
            const newBlock = {
              // @ts-ignore
              title: nameUntitledIfEmpty(child.child_page?.title ?? child.child_database.title),
              id: child.id,
              // @ts-ignore
              type: child.child_page?.title ? `page` : `database` as ChildInfo['type'], 
            }
            blocks.push(newBlock)
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
          const newBlock = {
            title: nameUntitledIfEmpty(identifyObjectTitle(child)),
            id: child.id,
            type: child.object
          }
          blocks.push(newBlock)
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
      retrieveBlocksRecurisvely({
        id: rootPageId, type: `page`, 
        title: `Root`
      }),
      new Promise((resolve) => {
        requestQueue.onComplete(resolve)
      }),
    ])
  )

  if (err) {
    throw err
  }

  return blocks
}
