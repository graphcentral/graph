export interface NotionContentNode {
  title: string
  id: string
  type: `database` | `page` | `error`
}

/**
 * A type used to represent a single Notion 'block'
 * or 'node' as we'd like to call it in this graph-related project
 */
export type NotionContentNodeUnofficialAPI =
  | {
      title: string
      id: string
      /**
       * Notion workspace id
       */
      spaceId: string
      /**
       * parent node's id
       */
      parentId: NotionContentNodeUnofficialAPI[`id`]
      type: `page` | `collection_view` | `alias`
    }
  | {
      title: string
      /**
       *  collection view page id
       *  */
      id: string
      /**
       * Notion workspace id
       */
      spaceId: string
      parentId: NotionContentNodeUnofficialAPI[`id`]
      type: `collection_view_page`
      /**
       * collection id
       * */
      collection_id: string
    }

export function isNotionContentNodeType(
  s: string
): s is NotionContentNodeUnofficialAPI[`type`] {
  return (
    s === `page` ||
    s === `collection_view` ||
    s === `collection_view_page` ||
    s === `alias`
  )
}
