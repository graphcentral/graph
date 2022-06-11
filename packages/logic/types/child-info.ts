export interface NotionContentNode {
  title: string
  id: string
  type: `database` | `page` | `error`
  parent?: NotionContentNode
}
