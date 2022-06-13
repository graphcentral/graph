import { BlockMap } from "./types/block-map"

export class Errors {
  public static NKG_0000(blockId: string): string {
    return `Could not find topmost block from blockId ${blockId}`
  }
  public static NKG_0001(block: BlockMap[keyof BlockMap]): string {
    return `Root block ${block.value.id} is not an acceptable type: ${
      block.value.type
    }. Full block:
${JSON.stringify(block, null, 2)}`
  }
  public static NKG_0002(block: BlockMap[keyof BlockMap]): string {
    return `Failed before requesting collectionData because either collection_id or collection_view_id is not available (or both). Full block:
${JSON.stringify(block, null, 2)}`
  }
  public static NKG_0003(propertyMustBeDefined: string): string {
    return `Failed to process collection_view. ${propertyMustBeDefined} is not defined.`
  }
  public static NKG_0004(collectionId: string): string {
    return `Failed to process collection_view. collectionId: ${collectionId} is not a key in collection.`
  }
}
