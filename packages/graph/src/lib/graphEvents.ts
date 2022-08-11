import { EventKey, EventEmitter as EE } from "ee-ts"
import { Link, LinkWithCoords, Node, WithCoords } from "./types"

interface GraphEventCallbacks<N extends Node = Node, L extends Link = Link> {
  clickNode({
    node,
    linkedNodes,
  }: {
    node: WithCoords<N>
    linkedNodes: WithCoords<N>[]
  }): void
  mouseOverNode(node: WithCoords<N>): void
  mouseOutNode(node: WithCoords<N>): void
  startLabels: VoidFunction
  startLayout: VoidFunction
  finishDb: VoidFunction
  finishGraph(nodesAndLinks: { nodes: WithCoords<N>[]; links: L[] }): void
  finishLabels(nodes: WithCoords<N>[]): void
  finishLayout(nodesAndLinks: { nodes: WithCoords<N>[]; links: L[] }): void
  error(e: Error): void
}

export type GraphEvents = EventKey<GraphEventCallbacks>

export class GraphEventEmitter<
  N extends WithCoords<Node> = WithCoords<Node>,
  L extends LinkWithCoords = LinkWithCoords
> extends EE<GraphEventCallbacks<N, L>> {}
