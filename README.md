# `@graphcentral/graph`

```bash
npm i --save @graphcentral/graph
```

![logo](./logo.png)

## Demo

👉 "5K nodes + 5K links": https://graphcentral.github.io/graph?graph_data=5000

👉 "50K nodes + 50K links": https://graphcentral.github.io/graph?graph_data=big

👉 "100K nodes + 100K links" (apprent degradation in performance expected): https://graphcentral.github.io/graph?graph_data=huge

👉 "Notion official help docs" (runs force layout algorithm on the browser): https://graphcentral.github.io/graph?graph_data=notion_docs

## Visualizing Notion pages 

You can visualize Notion pages on force layout graph using this library and `@graphcentral/notion` together.. Check out [@graphcentral/notion](https://github.com/graphcentral/notion).

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

For more complicated example using `@graphcentral/graph`, visit `packages/example`. More docs, and interactive demo to come (contributions are most welcome).
