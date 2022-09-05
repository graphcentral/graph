import * as PIXI from "pixi.js"
import { BitmapNodeLabel, VectorNodeLabel } from "./node-label"

/**
 * A type used to represent a single Notion 'block'
 * or 'node' as we'd like to call it in this graph-related project
 */
export type Node<Type = string> = {
  title?: string
  id: string
  /**
   * parent node's id
   */
  parentId?: Node[`id`]
  /**
   * nodeChildren count
   */
  cc?: number
  type?: Type

  /**
   * array index of node and link in Node[].
   * Becomes only available once webworker finishes the work
   */
  children?: { node: number; link: number }[]
  /**
   * array index of node and link in Node[].
   * Becomes only available once webworker finishes the work
   */
  parents?: { node: number; link: number }[]
}

export interface Link {
  source: Node[`id`]
  target: Node[`id`]
}

export type Coords = {
  x: number
  y: number
}

export type StringCoords = {
  x: number
  y: number
}

export type WithCoords<T> = T & Coords
export type WithStringCoords<T> = T & StringCoords
export type WithPartialCoords<T> = T & Partial<Coords>
export type LinkWithPartialCoords = {
  source: WithPartialCoords<Link[`source`]>
  target: WithPartialCoords<Link[`target`]>
}
export type LinkWithCoords<L extends Link = Link> = {
  source: WithCoords<L[`source`]>
  target: WithCoords<L[`target`]>
}
export type WithIndex<T> = T & {
  index: number
}

export type SmallestNextVisibilityInput = {
  data: string[]
  name: string
  renderAll?: boolean
  array: string[]
}

export type NotSmallestNextVisibilityInput = {
  data: Set<string>
  name: string
  renderAll?: boolean
  array: string[]
}

export type NextVisibilityInput =
  | SmallestNextVisibilityInput
  | NotSmallestNextVisibilityInput

export type KnowledgeGraphOptions<
  N extends WithPartialCoords<Node> = WithPartialCoords<Node>,
  L extends LinkWithPartialCoords = LinkWithPartialCoords
> = {
  optimization?: {
    /**
     * uses particle container for circle sprites.
     * this will show uniform color for all of the nodes when zoomed out.
     *
     * this will generally make rendering a bit faster but will disable
     * mouse hover interaction (only click possible) and set colors of all nodes
     * as white
     */
    useParticleContainer?: boolean
    /**
     * does not show edges between nodes
     * when user zooms out beyond certain level
     */
    showEdgesOnCloseZoomOnly?: boolean
    /**
     * set target FPS. between 1 and 60.
     */
    maxTargetFPS?: number
    /**
     * uses another transparent container on the top of particle container.
     * this will allow interaction with the particle container.
     *
     * this will have no affect if `useParticleContainer === false`.
     */
    useShadowContainer?: boolean
    /**
     * if set true, changes node (circle) style when hovered.
     * has no effect if `useParticleContainer === true`
     */
    useMouseHoverEffect?: boolean
  }
  graph?: {
    /**
     * set this as false if you already have
     * a graph data with x and y coordinates of nodes
     *
     * if you need to compute it on the browser when the knowledge graph
     * initializes, set this as true
     */
    runForceLayout?: boolean
    /**
     * pixi.js only supports showing basic alphanumeric characters
     * for BitmapFont. You will need to supply your own font
     * if the titles of the nodes are NOT english (for example, Chinese, Japanese or Korean, and so on..)
     *
     * For detailed options, see https://pixijs.download/dev/docs/PIXI.BitmapFont.html
     */
    customFont?: {
      /**
       * example: https://fonts.googleapis.com/css2?family=Mouse+Memoirs&display=swap
       */
      url: string
      /**
       * Options for the font, such as `fontFamily` or `fill`. You need to insert `fontFamily` as the name of the font.
       * For example, if the `url` is `https://fonts.googleapis.com/css2?family=Mouse+Memoirs&display=swap`,
       * `fontFamily` must be `"Mouse Memoirs"`.
       *
       * By default, the font's `fill` will be rendered in black and `fontFamily` will be set as none (falls back to the default font) if `fontFamily` and `fill` are not supplied,
       * even if `url` is present.
       */
      config?: Parameters<typeof PIXI.BitmapFont.from>[1]
      option?: Parameters<typeof PIXI.BitmapFont.from>[2]
    }
    /**
     * Custom zoom levels used for the conditional rendering of labels at different zoom levels
     */
    zoomLevels?: ZoomLevels
  }
}

export type NodeLabel<N extends Node = Node> =
  | BitmapNodeLabel<Node>
  | VectorNodeLabel<Node>

export type CustomFontConfig = NonNullable<
  KnowledgeGraphOptions[`graph`]
>[`customFont`]

export type Unpacked<T> = T extends (infer U)[] ? U : T

/**
 * Zoom levels for conditional rendering of labels on a graph.
 * By default, these values are hard coded. Refer to GraphScales.
 * ```
 * small = 0.0440836883806951,
 * medium = 0.013,
 * large = 0.00949999848460085,
 * ```
 */
export interface ZoomLevels {
  small: number
  medium: number
  large: number
}
