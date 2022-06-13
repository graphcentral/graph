import type { NotionAPI } from "notion-client"
import { nameUntitledIfEmpty } from "../official/notion-util"

type BlockMap = Awaited<ReturnType<NotionAPI[`getPage`]>>[`block`]

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
}
