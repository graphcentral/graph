export interface NotionContentNode {
  title: string
  id: string
  type: `database` | `page` | `error`
}

export interface NotionContentNodeUnofficialAPI {
  title: string
  id: string
  type: `page` | `collection_view` | `collection_view_page` | `alias`
}
