import * as PIXI from "pixi.js"
import { IBitmapTextStyle } from "pixi.js"
import { scaleByCC } from "./common-graph-util"
import { WithCoords } from "./types"

/**
 *  not included as a private function because
 * it cannot be called before `super` call in the class
 */
export class NodeLabelHelper {
  public static plainBitmapFontConfigs: [
    Parameters<typeof PIXI.BitmapFont[`from`]>[1],
    Parameters<typeof PIXI.BitmapFont[`from`]>[2]
  ] = [
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
    },
  ]
  public static MAX_NODE_TITLE_LENGTH = 35
  public static CUSTOM_FONT_NAME: Readonly<string> = `NKG_FONT`
  /**
   * This needs to be called before creating any `NodeLabel`
   * @param customFont custom font info (i.e. font family)
   * @param customFontOptions custom font configurations
   * @returns BitmapFont
   */
  public static installMaybeCustomFont(
    customFont?: PIXI.TextStyle | Partial<PIXI.ITextStyle>,
    customFontOptions?: PIXI.IBitmapFontOptions
  ) {
    if (customFont) {
      return PIXI.BitmapFont.from(
        this.CUSTOM_FONT_NAME,
        customFont,
        customFontOptions
      )
    } else {
      return PIXI.BitmapFont.from(
        this.CUSTOM_FONT_NAME,
        ...this.plainBitmapFontConfigs
      )
    }
  }
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
