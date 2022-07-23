import * as PIXI from "pixi.js"
import { IBitmapTextStyle } from "pixi.js"
import { WithCoords } from "."

export class NodeLabel<N> extends PIXI.BitmapText {
  private nodeData: WithCoords<N>

  constructor(
    text: string,
    nodeData: WithCoords<N>,
    style?: Partial<IBitmapTextStyle>
  ) {
    super(text, style)
    this.nodeData = nodeData
  }

  public getNodeData(): WithCoords<N> {
    return this.nodeData
  }
}
