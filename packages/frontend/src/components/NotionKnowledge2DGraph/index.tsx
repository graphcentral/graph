import React, { useEffect, useRef } from "react"
import { FC } from "react"
import { NotionKnowledge2DGraphFallback } from "./fallback"
import { enhance, tcAsync } from "../../utilities/essentials"
import testData from "../../../../test-data/test4.json"
import * as d3 from "d3"
// @ts-ignore
import * as ObserverableStdlib from "@observablehq/stdlib"

console.log(ObserverableStdlib)
const { Library } = ObserverableStdlib
const { DOM } = new Library()

// eslint-disable-next-line @typescript-eslint/ban-types
export type NotionKnowledgeGrap2DImpureProps = {}

export const NotionKnowledg2DGraphImpure: FC<NotionKnowledgeGrap2DImpureProps> =
  enhance<NotionKnowledgeGrap2DImpureProps>(() => {
    const rootElem = useRef<HTMLCanvasElement | null>(null)
    // const d3Ref = useRef<Awaited<
    //   // eslint-disable-next-line quotes
    //   typeof import("d3-force")
    // > | null>(null)

    useEffect(() => {
      function loadModule() {
        // Copyright 2021 Observable, Inc.
        // Released under the ISC license.
        // https://observablehq.com/@d3/force-directed-graph-canvas
        function ForceGraph(
          {
            //@ts-ignore
            nodes, // an iterable of node objects (typically [{id}, …])
            //@ts-ignore
            links, // an iterable of link objects (typically [{source, target}, …])
          },
          {
            //@ts-ignore
            nodeId = (d) => d.id, // given d in nodes, returns a unique identifier (string)
            //@ts-ignore
            nodeGroup, // given d in nodes, returns an (ordinal) value for color
            //@ts-ignore
            nodeGroups, // an array of ordinal values representing the node groups
            nodeFill = `currentColor`, // node stroke fill (if not using a group color encoding)
            nodeStroke = `#fff`, // node stroke color
            //@ts-ignore
            nodeStrokeWidth = 1.5, // node stroke width, in pixels
            //@ts-ignore
            nodeStrokeOpacity = 1, // node stroke opacity
            nodeRadius = 5, // node radius, in pixels
            //@ts-ignore
            nodeStrength,
            //@ts-ignore
            linkSource = ({ source }) => source, // given d in links, returns a node identifier string
            //@ts-ignore
            linkTarget = ({ target }) => target, // given d in links, returns a node identifier string
            linkStroke = `#999`, // link stroke color
            linkStrokeOpacity = 0.6, // link stroke opacity
            linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
            //@ts-ignore
            linkStrokeLinecap = `round`, // link stroke linecap
            //@ts-ignore
            //@ts-ignore
            linkStrength,
            colors = d3.schemeTableau10, // an array of color strings, for the node groups
            //@ts-ignore
            width = 640, // outer width, in pixels
            height = 400, // outer height, in pixels
            //@ts-ignore
            invalidation, // when this promise resolves, stop the simulation,
          } = {}
        ) {
          if (!rootElem.current) return

          // Compute values.
          const N = d3.map(nodes, nodeId).map(intern)
          const LS = d3.map(links, linkSource).map(intern)
          const LT = d3.map(links, linkTarget).map(intern)
          const G =
            nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern)
          const W =
            typeof linkStrokeWidth !== `function`
              ? null
              : d3.map(links, linkStrokeWidth)
          const L =
            typeof linkStroke !== `function` ? null : d3.map(links, linkStroke)

          // Replace the input nodes and links with mutable objects for the simulation.
          nodes = d3.map(nodes, (_, i) => ({ id: N[i] }))
          links = d3.map(links, (_, i) => ({ source: LS[i], target: LT[i] }))

          // Compute default domains.
          if (G && nodeGroups === undefined) nodeGroups = d3.sort(G)

          // Construct the scales.
          const color =
            nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors)

          // Construct the forces.
          const forceNode = d3.forceManyBody()
          // @ts-ignore
          const forceLink = d3.forceLink(links).id(({ index: i }) => N[i])
          if (nodeStrength !== undefined) forceNode.strength(nodeStrength)
          if (linkStrength !== undefined) forceLink.strength(linkStrength)

          const simulation = d3
            .forceSimulation(nodes)
            .force(`link`, forceLink)
            .force(`charge`, forceNode)
            .force(`center`, d3.forceCenter(width / 2, height / 2))
            .on(`tick`, ticked)

          const context = rootElem.current.getContext(`2d`)
          if (!context) return

          function ticked() {
            if (!context) return
            context.clearRect(0, 0, width, height)

            context.save()
            context.globalAlpha = linkStrokeOpacity
            for (const [i, link] of links.entries()) {
              context.beginPath()
              drawLink(link)
              // @ts-ignore
              context.strokeStyle = L ? L[i] : linkStroke
              // @ts-ignore
              context.lineWidth = W ? W[i] : linkStrokeWidth
              context.stroke()
            }
            context.restore()

            context.save()
            context.strokeStyle = nodeStroke
            context.globalAlpha = nodeStrokeOpacity
            for (const [i, node] of nodes.entries()) {
              context.beginPath()
              drawNode(node)
              // @ts-ignore
              context.fillStyle = G ? d3.color(G[i]) : nodeFill
              context.strokeStyle = nodeStroke
              context.fill()
              context.stroke()
            }
            context.restore()
          }

          function drawLink(d: any) {
            if (!context) return
            context.moveTo(d.source.x, d.source.y)
            context.lineTo(d.target.x, d.target.y)
          }

          function drawNode(d: any) {
            if (!context) return
            context.moveTo(d.x + nodeRadius, d.y)
            context.arc(d.x, d.y, nodeRadius, 0, 2 * Math.PI)
          }

          if (invalidation != null) invalidation.then(() => simulation.stop())

          function intern(value: any) {
            return value !== null && typeof value === `object`
              ? value.valueOf()
              : value
          }

          function drag(simulation: any) {
            function dragstarted(event: any) {
              if (!event.active) simulation.alphaTarget(0.3).restart()
              event.subject.fx = event.subject.x
              event.subject.fy = event.subject.y
            }

            function dragged(event: any) {
              event.subject.fx = event.x
              event.subject.fy = event.y
            }

            function dragended(event: any) {
              if (!event.active) simulation.alphaTarget(0)
              event.subject.fx = null
              event.subject.fy = null
            }

            return d3
              .drag()
              .on(`start`, dragstarted)
              .on(`drag`, dragged)
              .on(`end`, dragended)
          }

          return Object.assign(
            //@ts-ignore
            d3.select(context.canvas).call(drag(simulation)).node(),
            { scales: { color } }
          )
        }

        const chart = ForceGraph(testData, {
          nodeId: (d) => d.id,
          // @ts-ignore
          nodeGroup: (d) => d.parent,
          // @ts-ignore
          linkStrokeWidth: (l) => 3,
          width: 1000,
          height: 600,
          // invalidation, // a promise to stop the simulation when the cell is re-run
        })
      }

      loadModule()
    }, [])

    return (
      <NotionKnowledgeGrap2DPure rootElem={rootElem}>
        2
      </NotionKnowledgeGrap2DPure>
    )
  })(NotionKnowledge2DGraphFallback)

// eslint-disable-next-line @typescript-eslint/ban-types
export type NotionKnowledgeGraphPure2Drops = {
  rootElem: React.MutableRefObject<HTMLCanvasElement | null>
}

export const NotionKnowledgeGrap2DPure: FC<NotionKnowledgeGraphPure2Drops> =
  enhance<NotionKnowledgeGraphPure2Drops>(({ rootElem }) => (
    <canvas ref={rootElem}></canvas>
  ))(NotionKnowledge2DGraphFallback)
