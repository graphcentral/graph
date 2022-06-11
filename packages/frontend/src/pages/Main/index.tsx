import React from "react"
import { FC } from "react"
import { MainPageFallback } from "./fallback"
import { enhance } from "../../utilities/essentials"
import { NotionKnowledgeGraphImpure } from "src/components/NotionKnowledgeGraph"

export type MainPagePureProps = {}

export const MainPagePure: FC<MainPagePureProps> = enhance<MainPagePureProps>(
  () => (
    <div>
      <NotionKnowledgeGraphImpure />
    </div>
  )
)(MainPageFallback)
