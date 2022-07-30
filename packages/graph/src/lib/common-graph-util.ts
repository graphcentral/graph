import { Rectangle } from "pixi.js"
import { GraphScales } from "./graph-enums"
import { WithCoords, Node } from "./types"

export function isNodeInsideBonds(
  node: WithCoords<Node>,
  bounds: Rectangle
): boolean {
  // bounds.x: The X coordinate of the upper-left corner of the rectangle
  // bounds.y: The Y coordinate of the upper-left corner of the rectangle
  /**
   * x,y-------------------------
   * |                           |
   * |                           |
   * |                           |
   * ---------------------------- <-- (x + width, y - height)
   */
  return new Rectangle(
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height
  ).contains(node.x, node.y)
}

/**
 *
 * @param cc node.cc (children count)
 * @returns scaled number bigger than cc
 */
export function scaleByCC(cc: number): number {
  const numerator = Math.log(cc)
  const denominator = Math.log(6)
  return 1 + numerator / denominator
}

/**
 * Matches the current scale with appropriate minimum children count
 * Used to calculate which labels must appear based on current scale.
 * i.e. if zoomed out too much, you should probably see labels of nodes with
 * large children count (`cc`).
 * @param scale decreases as user zooms out
 */
export function scaleToMinChildrenCount(scale: number): number {
  // the order of the case statements matters.
  switch (true) {
    // invalid case
    case scale <= 0: {
      return -1
    }
    // don't show any texts
    case scale < GraphScales.CANNOT_SEE_ANYTHING_WELL:
      return Infinity
    case scale < GraphScales.CAN_SEE_BIG_NODES_WELL: {
      // show text from nodes having cc above 20
      return 20
    }
    case scale > GraphScales.CAN_SEE_BIG_NODES_WELL: {
      // show text from nodes having cc above 0
      return 0
    }
    default: {
      return -1
    }
  }
}
