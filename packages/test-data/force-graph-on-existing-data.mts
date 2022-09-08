import d3Force, { forceSimulation, forceCenter, forceLink, forceManyBody, forceRadial } from "d3-force"
import data from "./data/notion-help-docs.json" assert {type: "json"};
import fs from "fs"

const main = async () => {
  const forceLinks = forceLink(data.links)
  .id(
    (node) =>
      // @ts-ignore
      node.id
      )
  .distance(2000)
  // @ts-ignore
  const simulation = forceSimulation(data.nodes)
  .force(`link`, forceLinks)
  .force(`charge`, forceManyBody().strength(-40_000))
  .force(`center`, forceCenter())
  .force(`dagRadial`, forceRadial(1))
  .stop()
  for (let i = 0; i < 10; ++i) {
    console.log(`${i * 5}th tick...`)
    simulation.tick(5)
  }

  data.nodes.forEach((node) => {
    // @ts-ignore
    delete node['vx']
    // @ts-ignore
    delete node['vy']
  })
  data.links.forEach((link) => {
    // @ts-ignore
    delete link.source['vx']
    // @ts-ignore
    delete link.source['vy']
    // @ts-ignore
    delete link.source['vx']
    // @ts-ignore
    delete link.source['vy']
  })
  console.log(`writing`)
  await new Promise((resolve, reject) => {
    fs.writeFile(`test0.json`, JSON.stringify(data), (err) => {
      if (err) reject(err)
      else resolve(``)
    })
  });
  console.log(`writing done`)
  process.exit(0)
}

main()