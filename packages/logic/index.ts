import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import to from 'await-to-js';
import EventEmitter from 'events';
import { RequestQueue } from './request-queue';


dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env' )})

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

;(async () => {
  // const listUsersResponse = await notion.users.list({})
  // const pageExample = await notion.pages.retrieve({
  //   page_id: `c0505c2f58ce44bd820305a324eeea9f`,
  // })
  // console.log(listUsersResponse)
  // console.log(pageExample)
})()


;(async () => {
  // const r1 = await notion.search({
  //   page_size: 10,
  //   // query: 'crawl',
  //   // sort: {
  //   //   direction: 'ascending',
  //   //   timestamp: 'last_edited_time',
  //   // },
  // });
  // const r2 = await notion.blocks.retrieve({
  //   block_id: separateIdWithDashSafe(`aa362e29a8c24d6ba084ceca5a717db6`)
  //             // `1429989f-e8ac-4eff-bc8f-57f56486db54`
  //           // 16d8004e-5f6a-42a6-9811-51c22ddada12
  // })
  // try{
  //   const r3 = await notion.pages.retrieve({
  //     page_id: separateIdWithDashSafe(`aa362e29a8c24d6ba084ceca5a717db6`),

  //               // `1429989f-e8ac-4eff-bc8f-57f56486db54`
  //             // 16d8004e-5f6a-42a6-9811-51c22ddada12
  //   })
  //   console.log(r3)
  // } catch (e) {
  //   console.log(`page failed`)
  // }
  // fs.writeFileSync('./searchresult.json', JSON.stringify(r1, undefined, 2))
  // fs.writeFileSync('./blockretrieveresult.json', JSON.stringify(r2, undefined, 2))
  // console.log(r1)
  // console.log(r2)
  // const r4 = await notion.blocks.children.list({
  //   block_id: separateIdWithDashSafe(`aa362e29a8c24d6ba084ceca5a717db6`)
  // });
  // fs.writeFileSync('./blockchildrenlist.json', JSON.stringify(r4, undefined, 2))
  // r4.results.forEach((r) => {
    //   console.log(r)
    //   // console.log(identify_object_title(r))
    // })
    // const q = await to(notion.databases.query({
    //   database_id: `025ecc41-9e1e-4525-ace8-94586cd20493`,
    //   page_size: 50,
    // }))
    // const q2 = await to(notion.databases.retrieve({
    //   database_id: `025ecc41-9e1e-4525-ace8-94586cd20493`,
    // }))
    // const q3 = await to(notion.blocks.retrieve({
    //   block_id: `025ecc41-9e1e-4525-ace8-94586cd20493`,
    // }))
    // const q4 = await to(notion.pages.retrieve({
    //   page_id: `025ecc41-9e1e-4525-ace8-94586cd20493`,
    // }))
    // console.log(q)
    // const [err, result] = q;
    // if (result) {
    //   console.log(JSON.stringify(result.results, undefined, 2))
    // }
    // console.log(q2)
    // console.log(q3)
    // console.log(q4)
    const blocks = await retrieveBlocks(`aa362e29a8c24d6ba084ceca5a717db6`)
    console.log(`DONE`)
    console.log(blocks)
  })();
  
  interface BlockInfo {
    title: string;
    id: string;
  }
  
  async function retrieveBlocks(rootPageId: string): Promise<BlockInfo[]> {
    const blocks: BlockInfo[] = [{
      title: `Root`,
      id: separateIdWithDashSafe(rootPageId),
    }]
    const requestQueue = new RequestQueue({ maxConcurrentRequest: 3 })
    let a = 0
    
    async function retrieveBlocksRecurisvely(id: string, childType?: `child_database` | `child_page`) {
      let blockChildren: Awaited<ReturnType<typeof notion['blocks']['children']['list']>> | null = null
      let databaseChildren: Awaited<ReturnType<typeof notion['databases']['query']>> | null = null
      switch (childType) {
        case `child_database`: {
          databaseChildren = await notion.databases.query({
            database_id: separateIdWithDashSafe(id),
            page_size: 50,
          })
          console.log(`databaseChildren`)
          console.log(databaseChildren)
          break
        }
        case `child_page`: {
          blockChildren = await notion.blocks.children.list({
            block_id: separateIdWithDashSafe(id),
            page_size: 50,
          });
        }
    }
    if (a == 0) {
      fs.writeFileSync('./children.json', JSON.stringify(blockChildren, undefined, 2))
    }
    const queryChild = (child: any) => {
      // @ts-ignore
      switch (child.type) {
        case `child_page`: {
          requestQueue.enqueue(() => retrieveBlocksRecurisvely(child.id, `child_page`))
          break;
        }
        case `child_database`: {
          requestQueue.enqueue(() => retrieveBlocksRecurisvely(child.id, `child_database`))
          break;
        }
      }
    }
    if (blockChildren) {
      for (const child of blockChildren.results) {
        // @ts-ignore
        if (child.type === `child_database` || child.type === `child_page`) {
          blocks.push({
            // @ts-ignore
            title: child.child_page?.title ?? child.child_database.title,
            id: child.id,
          })
        }
        queryChild(child)
      }
    } else if (databaseChildren) {
      for (const child of databaseChildren.results) {
        blocks.push({
          // @ts-ignore
          title: identify_object_title(child),
          id: child.id,
        })
        queryChild(child)
      }
    }
  }

  const [err] = await to(Promise.allSettled([
    retrieveBlocksRecurisvely(rootPageId, `child_page`),
    new Promise((resolve) => {
      requestQueue.onComplete(resolve)
    })
  ]))

  if (err) {
    throw err
  }

  return blocks
}

function identify_object_title(obj: any): string {
  if (obj.object === `database`) {
    // @ts-ignore
    return (
      obj.title?.[0].plain_text
      )
    } else if (obj.object === `page`) {
    // @ts-ignore
    return (
      obj.properties?.Name?.title?.[0].plain_text ??
      obj.properties?.title?.title?.[0].plain_text
    )
  }

  throw new Error(`should never get here`)
}

/**
 * 
 * @param maybe_without_dash 1429989fe8ac4effbc8f57f56486db54
 * @returns 1429989f-e8ac-4eff-bc8f-57f56486db54
 */
function separateIdWithDashSafe(maybe_without_dash: string): string {
  if (isIdAlreadySeparateByDash(maybe_without_dash)) {
    return maybe_without_dash
  }

  if (maybe_without_dash.length != 32) {
    throw new Error(`Incorrect length of id: ${maybe_without_dash.length}`)
  }
  
  if (!/^[a-zA-Z0-9]{32}$/.test(maybe_without_dash)) {
    throw new Error(`Incorrect format of id: ${maybe_without_dash}. It must be /^[a-zA-Z0-9]{32}$/`)
  }

  return `${maybe_without_dash.substring(0, 8)}-${maybe_without_dash.substring(8, 12)}-${maybe_without_dash.substring(12, 16)}-${maybe_without_dash.substring(16, 20)}-${maybe_without_dash.substring(20, 32)}`
}

function isIdAlreadySeparateByDash(maybe_separate_with_dash: string): boolean {
  if (maybe_separate_with_dash.length !== 36) {
    return false;
  }
  return /^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$/.test(maybe_separate_with_dash)
}