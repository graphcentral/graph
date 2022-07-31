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
export type LinkWithCoords = {
  source: WithCoords<Link[`source`]>
  target: WithCoords<Link[`target`]>
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

export type KnowledgeGraphOptions = {
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
    runForceLayout?: boolean
  }
}
