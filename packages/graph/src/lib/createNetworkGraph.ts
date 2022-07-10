import * as PIXI from "pixi.js"
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

  const children = []
  for (const node of nodes) {
    const circle = new PIXI.Sprite(texture)
    const x = Math.random() * app.screen.width
    const y = Math.random() * app.screen.height
    circle.x = x
    circle.y = y
    children.push(circle)
  }

  app.stage.addChild(...children)
}
