import React from "react"
import { FC } from "react"
import { NotionKnowledgeGraphFallback } from "src/components/NotionKnowledgeGraph/fallback"
import { enhance } from "../../utilities/essentials"

// eslint-disable-next-line @typescript-eslint/ban-types
export type NotionKnowledgeGraphImpureProps = {}

export const NotionKnowledgeGraphImpure: FC<NotionKnowledgeGraphImpureProps> =
  enhance<NotionKnowledgeGraphImpureProps>(() => {
    return <NotionKnowledgeGraphPure>2</NotionKnowledgeGraphPure>
  })(NotionKnowledgeGraphFallback)

// eslint-disable-next-line @typescript-eslint/ban-types
export type NotionKnowledgeGraphPureProps = {}

export const NotionKnowledgeGraphPure: FC<NotionKnowledgeGraphPureProps> =
  enhance<NotionKnowledgeGraphPureProps>(({ children }) => (
    <div>
      <p>{children}</p>
    </div>
  ))(NotionKnowledgeGraphFallback)
