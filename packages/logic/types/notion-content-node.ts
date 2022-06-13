export interface NotionContentNode {
  title: string
  id: string
  type: `database` | `page` | `error`
}

export type NotionContentNodeUnofficialAPI =
  | {
      title: string
      id: string
      type: `page` | `collection_view` | `alias`
    }
  | {
      title: string
      /**
       *  collection view page id
       *  */
      id: string
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
