import randomWords from "random-words"
import fs from "fs"
import path from 'path'

async function  main() {
  console.log(`started...`)
  const CHILDREN_NODES_NUM = 50_000
  const PARENT_NODES_NUM = 5000
  const GENERATE_LAYOUT = true
  const MAX_CC = 25
  console.log(`generating words...`)
  
  const parentWords = randomWords({ exactly: PARENT_NODES_NUM, maxLength: 10 })
  const childWords = randomWords({ exactly: CHILDREN_NODES_NUM, maxLength: 10 })
  const childNodes: { id: string; title: string; cc: number; parentId: string }[] =
  []
  const parentNodes: { id: string; title: string; cc: number; parentId: string }[] =
  []
  const parentLinks: { source: string; target: string }[] = []
  console.log(`generating graph...`)
  for (const i of [...Array(PARENT_NODES_NUM).keys()]) {
    parentNodes.push({
      id: String(i),
      title: parentWords[i],
      cc: 0,
      parentId: `none`,
    })
  }

  console.log(parentNodes.length)
  
  for (const i of [...Array(CHILDREN_NODES_NUM).keys()]) {
    const index = i + 5000
    const parentId = Math.round(Math.random() * (PARENT_NODES_NUM - 1))
    childNodes.push({
      id: String(index),
      title: childWords[index - 5000],
      cc: 1,
      parentId: String(parentId),
    })
    parentLinks.push({
      source: String(parentId),
      target: String(index),
    })
    parentNodes[parentId].cc += 1
  }

  const d3Force = await import(`d3-force`)
  const { forceCenter, forceLink, forceManyBody, forceRadial, forceSimulation } = d3Force
  const randomLinks = [...Array(Math.round(CHILDREN_NODES_NUM / 4)).keys()]
    .filter((id) => id)
    .map((id) => ({
      source: String(id),
      target: String(Math.round(Math.random() * (id - 1))),
    }))
  const nodes = [...childNodes, ...parentNodes]
  const links = [...parentLinks, ...randomLinks]
  console.log(`generating layout...`)
  const forceLinks = forceLink(links)
  .id(
          (node) =>
            // @ts-ignore
            node.id
            )
        .distance(2000)
        // @ts-ignore
        const simulation = forceSimulation(nodes)
        // .force(`charge`, forceCollide().radius(150))
        // .force(`link`, forceLinks)
        // .force(`x`, forceX().strength(-0.1))
        // .force(`y`, forceY().strength(-0.1))
        // .force(`center`, forceCenter())
        .force(`link`, forceLinks)
        .force(`charge`, forceManyBody().strength(-40_000))
        .force(`center`, forceCenter())
        .force(`dagRadial`, forceRadial(1))
        .stop()
  for (let i = 0; i < 10; ++i) {
    console.log(`${i * 5}th tick...`)
    simulation.tick(5)
  }
  console.log(`generating json...`)
  const graph = {
    info: {
      "pre-computed layout": GENERATE_LAYOUT,
      nodesLength: nodes.length, 
      linksLength: links.length,
    },
    nodes,
    links,
  }
  const outputFileName = `prelayout-${GENERATE_LAYOUT}-nodes-${nodes.length}-links-${links.length}.json`
  fs.rmSync(outputFileName, {
    force: true,
  })
  fs.writeFileSync(outputFileName, JSON.stringify(graph))
  console.log(`finished...`)
  console.log(path.resolve(outputFileName))
  process.exit(0)
}

main()
