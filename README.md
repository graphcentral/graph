# `@graphcentral/graph` and other utilities

![logo](./logo.png)

## Demo

👉 https://graphcentral.github.io/graph

## What you can get

Example of a knowledge graph of Notion Help docs:
![example0.png](./example0.png)

## How to

Simplest example:
```ts
import { KnowledgeGraph } "@graphcentral/graph"

const canvasElement = document.createElement(`canvas`)
document.body.appendChild(canvasElement)

const { nodes, links } = await fetch(
  `https://raw.githubusercontent.com/9oelM/datastore/main/notion-help-docs.json`
).then((resp) => resp.json())

if (!nodes || !links) {
  // error
  return
}

const knowledgeGraph = new KnowledgeGraph({
    nodes: nodes,
    links: links,
    canvasElement,
    options: {
      optimization: {
        useParticleContainer: false,
        useShadowContainer: false,
        showEdgesOnCloseZoomOnly: true,
        useMouseHoverEffect: true,
        maxTargetFPS: 60,
      },
      graph: {
        runForceLayout: true,
        customFont: {
          url: `https://fonts.googleapis.com/css2?family=Do+Hyeon&display=swap`,
          config: {
            fill: 0xffffff,
            fontFamily: `Do Hyeon`,
          },
        },
      },
    },
  })
knowledgeGraph.createNetworkGraph()
```

For more complicated example, visit `packages/test` for a sample code using `@graphcentral/graph`. More docs, and interactive demo to come (contributions are most welcome).
