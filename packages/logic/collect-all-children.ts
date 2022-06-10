import { Client } from "@notionhq/client"
import to from "await-to-js"
import { RequestQueue } from "./request-queue"
import { separateIdWithDashSafe, identifyObjectTitle } from "./util"

interface ChildrenInfo {
  title: string
  id: string
}

export async function collectAllChildren(
  notion: Client,
  rootPageId: string
): Promise<ChildrenInfo[]> {
  const blocks: ChildrenInfo[] = [
    {
      title: `Root`,
      id: separateIdWithDashSafe(rootPageId),
    },
  ]
  const requestQueue = new RequestQueue({ maxConcurrentRequest: 3 })

  async function retrieveBlocksRecurisvely(
    id: string,
    childType?: `child_database` | `child_page`
  ) {
    let blockChildren: Awaited<
      ReturnType<typeof notion[`blocks`][`children`][`list`]>
    > | null = null
    let databaseChildren: Awaited<
      ReturnType<typeof notion[`databases`][`query`]>
    > | null = null
    switch (childType) {
      case `child_database`: {
        databaseChildren = await notion.databases.query({
          database_id: separateIdWithDashSafe(id),
          page_size: 50,
        })
        break
      }
      case `child_page`: {
        blockChildren = await notion.blocks.children.list({
          block_id: separateIdWithDashSafe(id),
          page_size: 50,
        })
      }
    }
    const queryChild = (child: any) => {
      // @ts-ignore
      switch (child.type) {
        case `child_page`: {
          requestQueue.enqueue(() =>
            retrieveBlocksRecurisvely(child.id, `child_page`)
          )
          break
        }
        case `child_database`: {
          requestQueue.enqueue(() =>
            retrieveBlocksRecurisvely(child.id, `child_database`)
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
            blocks.push({
              // @ts-ignore
              title: child.child_page?.title ?? child.child_database.title,
              id: child.id,
            })
          }
          queryChild(child)
        } catch (e) {
          console.log(e)
          console.log(`e`)
      }
    }
    } else if (databaseChildren) {
      for (const child of databaseChildren.results) {
        try {
          blocks.push({
            title: identifyObjectTitle(child),
            id: child.id,
          })
          queryChild(child)
        } catch (e) {
          console.log(e)
          console.log(`e`)
        }
      }
    }
  }

  const [err] = await to(
    Promise.allSettled([
      retrieveBlocksRecurisvely(rootPageId, `child_page`),
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
