import { Rectangle } from "pixi.js"
import { WithCoords, Node } from "."

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
  return 1 + Math.log10(cc)
}
