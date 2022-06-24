import React from "react"
import { FC } from "react"
import { MainPageFallback } from "./fallback"
import { enhance } from "../../utilities/essentials"
import { NotionKnowledg2DGraphImpure } from "src/components/NotionKnowledge2DGraph"

export type MainPagePureProps = {}

export const MainPagePure: FC<MainPagePureProps> = enhance<MainPagePureProps>(
  () => (
    <div>
      <NotionKnowledg2DGraphImpure />
    </div>
  )
)(MainPageFallback)
