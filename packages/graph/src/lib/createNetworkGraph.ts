import * as PIXI from "pixi.js"
import createLayout from "ngraph.forcelayout"
import createGraph from "ngraph.graph"
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
   * children count
   */
  cc?: number
  type?: Type
}

interface Link {
  source: Node[`id`]
  target: Node[`id`]
}

export async function createNetworkGraph<N extends Node, L extends Link>({
  nodes,
  links,
}: {
  nodes: N[]
  links: L[]
}) {
  const graph = createGraph<Node, Link>()
  for (const node of nodes) {
    graph.addNode(node.id, node)
  }
  for (const link of links) {
    graph.addLink(link.source, link.target, link)
  }
  const layout = createLayout(graph, {
    timeStep: 0.5,
    dimensions: 2,
    gravity: -12,
    theta: 0.8,
    springLength: 10,
    springCoefficient: 0.8,
    dragCoefficient: 0.9,
  })
  for (let i = 0; i < 1000; ++i) {
    layout.step()
  }

  const app = new PIXI.Application({
    backgroundColor: 0x1099bb,
    resizeTo: window,
  })
  document.body.appendChild(app.view)

  const circleTemplate = new PIXI.Graphics()
    .lineStyle(0)
    .beginFill(0xde3249, 1)
    .drawCircle(100, 250, 5)
    .endFill()

  const texture = app.renderer.generateTexture(circleTemplate)

  const children: Array<PIXI.Sprite> = []
  graph.forEachNode(function (node) {
    const pos = layout.getNodePosition(node.id)
    // Node position is pair of x,y coordinates:
    const circle = new PIXI.Sprite(texture)
    circle.x = pos.x
    circle.y = pos.y
    children.push(circle)
  })

  graph.forEachLink(function (link) {
    console.log(layout.getLinkPosition(link.id))
    // link position is a pair of two positions:
    // {
    //   from: {x: ..., y: ...},
    //   to: {x: ..., y: ...}
    // }
  })
  const rect = layout.getGraphRect()
  const r = new PIXI.Rectangle(
    rect.x1,
    rect.y1,
    Math.abs(rect.x1 - rect.x2),
    Math.abs(rect.y2 - rect.y1)
  )
  app.screen.enlarge(r)
  app.stage.addChild(...children)
}
