import { NotionContentNode } from "./notion-content-node"

export type NodesGraph = Record<
  NotionContentNode[`id`],
  Record<NotionContentNode[`id`], boolean>
>
