import * as PIXI from "pixi.js"
import { scaleByCC } from "./common-graph-util"
import { CustomFontConfig, Node, WithCoords } from "./types"

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
  protected static customFontConfig?:
    | PIXI.TextStyle
    | Partial<PIXI.ITextStyle> = {}
  protected static customFontOptions?: PIXI.IBitmapFontOptions = {}
  public static MAX_NODE_TITLE_LENGTH = 35
  public static CUSTOM_FONT_NAME: Readonly<string> = `NKG_FONT`
  public static CJKRegex =
    /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\u3131-\uD79D]/g
  /**
   * This needs to be called before creating any `NodeLabel`
   * @param customFont custom font info (i.e. font family)
   * @param customFontOptions custom font configurations
   * @returns BitmapFont
   */
  public static installCustomFont(
    customFont?: PIXI.TextStyle | Partial<PIXI.ITextStyle>,
    customFontOptions?: PIXI.IBitmapFontOptions
  ) {
    this.customFontConfig = customFont
    this.customFontOptions = customFontOptions
    return PIXI.BitmapFont.from(
      this.CUSTOM_FONT_NAME,
      customFont,
      customFontOptions
    )
  }

  public static installDefaultFont() {
    return PIXI.BitmapFont.from(
      this.CUSTOM_FONT_NAME,
      ...this.plainBitmapFontConfigs
    )
  }

  public static installMaybeCustomFont(customFontConfig?: CustomFontConfig) {
    if (customFontConfig) {
      this.installCustomFont(customFontConfig.config, customFontConfig.option)
    } else {
      this.installDefaultFont()
    }
  }

  public static containsCJK(text: string): boolean {
    return this.CJKRegex.test(text)
  }

  public static getMaybeShortenedTitle(text: string): string {
    return text.length > this.MAX_NODE_TITLE_LENGTH
      ? `${text.substring(0, this.MAX_NODE_TITLE_LENGTH)}...`
      : text
  }

  public static createNodeLabel<N extends Node = Node>(
    text: string,
    nodeData: WithCoords<N>
  ) {
    const cc = nodeData.cc ?? 0
    if (this.containsCJK(text)) {
      return new VectorNodeLabel(
        text,
        nodeData,
        cc,
        this.customFontConfig,
        this.customFontOptions
      )
    } else {
      return new BitmapNodeLabel(text, nodeData, cc)
    }
  }
}

abstract class NodeLabel<N> {
  public abstract getNodeData(): WithCoords<N>
}

export class BitmapNodeLabel<N>
  extends PIXI.BitmapText
  implements NodeLabel<N>
{
  private nodeData: WithCoords<N>
  constructor(text: string, nodeData: WithCoords<N>, cc: number) {
    super(text, {
      fontSize: 100 * Math.max(1, scaleByCC(cc)),
      fontName: NodeLabelHelper.CUSTOM_FONT_NAME,
    })
    this.nodeData = nodeData
  }
  public getNodeData(): WithCoords<N> {
    return this.nodeData
  }
}

export class VectorNodeLabel<N> extends PIXI.Text implements NodeLabel<N> {
  private nodeData: WithCoords<N>
  constructor(
    text: string,
    nodeData: WithCoords<N>,
    cc: number,
    customFontConfig: NonNullable<CustomFontConfig>[`config`],
    customFontOptions: NonNullable<CustomFontConfig>[`option`]
  ) {
    super(text, {
      ...customFontConfig,
      ...customFontOptions,
      fontSize: 100 * Math.max(1, scaleByCC(cc)),
      // fontFamily: NodeLabelHelper.CUSTOM_FONT_NAME,
    })
    this.nodeData = nodeData
  }

  public getNodeData(): WithCoords<N> {
    return this.nodeData
  }
}
