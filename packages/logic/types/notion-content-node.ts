export interface NotionContentNode {
  title: string
  id: string
  type: `database` | `page` | `error`
}

export interface NotionContentNodeUnofficialAPI {
  title: string
  /**
   * plain id not separated by dash
   */
  id: string
  type: `page` | `collection_view` | `collection_view_page` | `alias`
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
