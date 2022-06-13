import type { NotionAPI } from "notion-client"
import { nameUntitledIfEmpty } from "../official/notion-util"
import { Block, BlockMap } from "../types/block-map"
import { NotionContentNodeUnofficialAPI } from "../types/notion-content-node"

export class UnofficialNotionAPIUtil {
  /**
   * Be as conservative as possible because
   * Notion API may change any time
   * @param page
   * @returns
   */
  public static getTitleFromPageBlock(page: BlockMap[keyof BlockMap]): string {
    const { properties } = page.value

    if (!properties) {
      return `Unknown title`
    }

    const title = properties?.title?.[0]?.[0]

    if (!title) {
      return `Unknown title`
    }

    return nameUntitledIfEmpty(title)
  }

  public static getTitleFromCollectionBlock(collectionBlock: Block): string {
    const name: string | undefined =
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      collectionBlock.value?.name?.[0]?.[0]

    if (!name) {
      return `Unknown database title`
    }

    return name
  }
  /**
   * `parent_table` is space if the block is at the top level of all pages (= the block is
   * one of the pages we can click on from the left navigation panel on Notion app)
   * @param block any block (page, collection view page, ...)
   * @returns whether the block is a top level page or collection view page.
   */
  public static isBlockToplevelPageOrCollectionViewPage(
    block: BlockMap[keyof BlockMap]
  ): boolean {
    return block.value.parent_table === `space`
  }

  /**
   * Gets a notion content node from a block.
   * But the type could be anything. It's not one of the four block types we want yet.
   */
  public static extractTypeUnsafeNotionContentNodeFromBlock(
    block: BlockMap[keyof BlockMap]
  ): Omit<NotionContentNodeUnofficialAPI, `type`> & { type: string } {
    const title = UnofficialNotionAPIUtil.getTitleFromPageBlock(block)
    const type = block.value.type

    return {
      id: block.value.id,
      title,
      type,
    }
  }
}
