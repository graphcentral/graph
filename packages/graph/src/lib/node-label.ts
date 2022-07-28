import * as PIXI from "pixi.js"
import { IBitmapTextStyle } from "pixi.js"
import { scaleByCC } from "./common-graph-util"
import { WithCoords } from "./types"

/**
 *  not included as a private function because
 * it cannot be called before `super` call in the class
 */
class NodeLabelHelper {
  public static MAX_NODE_TITLE_LENGTH = 35
  public static CUSTOM_FONT_NAME: Readonly<string> = `NKG_FONT`
  public static CUSTOM_FONT = PIXI.BitmapFont.from(
    this.CUSTOM_FONT_NAME,
    {
      fill: `#FFFFFF`,
      fontSize: 100,
      fontWeight: `bold`,
    },
    {
      resolution: window.devicePixelRatio,
      chars: [
        [`a`, `z`],
        [`A`, `Z`],
        [`0`, `9`],
        `~!@#$%^&*()_+-={}|:"<>?[]\\;',./ `,
      ],
    }
  )
  public static getMaybeShortenedTitle(text: string): string {
    return text.length > this.MAX_NODE_TITLE_LENGTH
      ? `${text.substring(0, this.MAX_NODE_TITLE_LENGTH)}...`
      : text
  }
}

export class NodeLabel<N> extends PIXI.BitmapText {
  private nodeData: WithCoords<N>

  constructor(text: string, nodeData: WithCoords<N>, cc: number) {
    super(NodeLabelHelper.getMaybeShortenedTitle(text), {
      fontSize: 100 * Math.max(1, scaleByCC(cc)),
      fontName: NodeLabelHelper.CUSTOM_FONT_NAME,
    })
    this.nodeData = nodeData
  }

  public getNodeData(): WithCoords<N> {
    return this.nodeData
  }
}
