import randomWords from "random-words"
import fs from "fs"
import path from 'path'
import arg from 'arg'

/**
 * This simple script creates a graph data for testing
 */

const args = arg({
	'--help': Boolean,
	'--parent': Number,
	'--children': Number,
	'--maxCC': Number, 
	'--genLayout': Number, 
	// Aliases
	'-h': '--help',
	'-p': '--parent', 
	'-c': '--children',
	'-mc': '--maxCC' 
});

const parsedArgs = {
  '--help': 0,
  '--children': 49500,
  '--parent': 500,
  '--maxCC': 25,
  '--genLayout': 0,
};
type ParsedArgsKeys = keyof typeof parsedArgs
type ParsedArgsVals = typeof parsedArgs[ParsedArgsKeys]

for (const [argKey, argVal] of Object.entries(args)) {
  switch (argKey as ParsedArgsKeys) {
    case `--help`:
      console.log(`example: node --loader ts-node/esm test-data-gen.mts --children=49500 --parent=500 --maxCC=25 --genLayout=0`)
      process.exit(0)
      break
    case `--children`:
    case `--parent`:
    case `--maxCC`:
    case `--genLayout`:
      const typedArgKey = argKey as ParsedArgsKeys
      const typedArgVal = argVal as ParsedArgsVals
      if (argVal) parsedArgs[typedArgKey] = typedArgVal
  }
}

async function  main() {
  console.log(`started...`)
  console.log(JSON.stringify(parsedArgs))
  const CHILDREN_NODES_NUM = parsedArgs['--children']
  const PARENT_NODES_NUM = parsedArgs['--parent']
  const GENERATE_LAYOUT = Boolean(parsedArgs['--genLayout'])
  const MAX_CC = parsedArgs['--maxCC']
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

  for (const i of [...Array(CHILDREN_NODES_NUM).keys()]) {
    const index = i + PARENT_NODES_NUM
    const parentId = Math.round(Math.random() * (PARENT_NODES_NUM - 1))
    childNodes.push({
      id: String(index),
      title: childWords[index - PARENT_NODES_NUM],
      cc: 1,
      parentId: String(parentId),
    })
    parentLinks.push({
      source: String(index),
      target: String(parentId),
    })
    parentNodes[parentId].cc += 1
  }

  const d3Force = await import(`d3-force`)
  const { forceCenter, forceLink, forceManyBody, forceRadial, forceSimulation } = d3Force
  const randomLinks = [...Array(Math.round(CHILDREN_NODES_NUM / 4)).keys()]
    .filter((id) => id)
    .map((id) => {
      const parentId = Math.round(Math.random() * (PARENT_NODES_NUM - 1))
      parentNodes[parentId].cc += 1
      return ({
        source: String(id),
        target: String(parentId),
      })
    })
  const nodes = [...childNodes, ...parentNodes]
  const links = [...parentLinks, ...randomLinks]
  console.log(`generating layout...`)
  if (GENERATE_LAYOUT) {
    const forceLinks = forceLink(links)
    .id(
      (node) =>
        // @ts-ignore
        node.id
        )
    .distance(2000)
    // @ts-ignore
    const simulation = forceSimulation(nodes)
    .force(`link`, forceLinks)
    .force(`charge`, forceManyBody().strength(-40_000))
    .force(`center`, forceCenter())
    .force(`dagRadial`, forceRadial(1))
    .stop()
    for (let i = 0; i < 10; ++i) {
      console.log(`${i * 5}th tick...`)
      simulation.tick(5)
    }
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
  fs.rmSync(path.resolve(`data`, outputFileName), {
    force: true,
  })
  fs.writeFileSync(path.resolve('data', outputFileName), JSON.stringify(graph))
  console.log(`finished...`)
  console.log(path.resolve(outputFileName))
  process.exit(0)
}

main()
