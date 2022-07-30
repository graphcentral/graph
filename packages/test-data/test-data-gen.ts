import randomWords from "random-words"
import fs from "fs"

function main() {
  console.log(`started...`)
  const NODES_NUM = 50_000
  const PARENTS_NUM = 5000
  const MAX_CC = 25
  console.log(`generating words...`)
  const words = randomWords({ exactly: NODES_NUM, maxLength: 10 })
  console.log(`generating graph...`)

  const nodes: { id: string; title: string; cc: number; parentId: string }[] =
    []
  const parentLinks: { source: string; target: string }[] = []
  for (const i of [...Array(NODES_NUM).keys()]) {
    const parentId = String(Math.round(Math.random() * PARENTS_NUM))
    nodes.push({
      id: String(i),
      title: words[i],
      cc: Math.round(Math.random() * MAX_CC),
      parentId: parentId,
    })
    parentLinks.push({
      source: parentId,
      target: String(i),
    })
  }

  const randomLinks = [...Array(Math.round(NODES_NUM / 2)).keys()]
    .filter((id) => id)
    .map((id) => ({
      source: String(id),
      target: String(Math.round(Math.random() * (id - 1))),
    }))
  const graph = {
    nodes,
    links: [...parentLinks, ...randomLinks],
  }
  console.log(`generating json...`)
  fs.rmSync(`random-test-data.json`, {
    force: true,
  })
  fs.writeFileSync(`random-test-data.json`, JSON.stringify(graph))
  console.log(`finished...`)
  process.exit(0)
}

main()
