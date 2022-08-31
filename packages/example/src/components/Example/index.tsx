import React, {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { FC } from "react"
import { enhance, tcAsync } from "../../utilities/essentials"
import { ExampleFallback } from "./fallback"
import { Node, Link, KnowledgeGraph, WithCoords } from "@graphcentral/graph"

enum Errors {
  IMPORT_FAILED = `IMPORT_FAILED`,
  FETCH_TEST_DATA_FAILED = `FETCH_TEST_DATA_FAILED`,
}

enum LoadStatus {
  IMPORT_LIB = `IMPORT_LIB`,
  FETCH_DATA = `FETCH_DATA`,
  LAYOUT = `LAYOUT`,
  DB = `DB`,
  LABEL = `LABEL`,
}

const LoadStatusToText: Record<keyof typeof LoadStatus, string> = {
  IMPORT_LIB: `Importing library...`,
  FETCH_DATA: `Fetching graph data...`,
  LAYOUT: `Loading layout...`,
  DB: `Loading DB (You can see labels after this)...`,
  LABEL: `Loading labels...`,
}

type JSONResponse = {
  nodes?: Node[]
  links?: Link[]
  errors?: Array<{ message: string }>
}

const preStyle = {
  width: `300px`,
}

const NotionNodeListItem: FC<{
  node: WithCoords<Node>
  knowledgeGraphRef: MutableRefObject<KnowledgeGraph<
    WithCoords<Node<string>>,
    Link
  > | null>
}> = enhance<{
  node: WithCoords<Node>
  knowledgeGraphRef: MutableRefObject<KnowledgeGraph<
    WithCoords<Node<string>>,
    Link
  > | null>
}>(({ node, knowledgeGraphRef }) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false)
  const openNotionPageOnClick = useCallback(
    () => window.open(`https://notion.so/${node.id.replaceAll(`-`, ``)}`),
    [node.id]
  )
  const onListItemClick = useCallback(
    () => setDropdownOpen((prev) => !prev),
    []
  )
  const onNavigateToNode = useCallback(() => {
    knowledgeGraphRef.current?.moveTo({ x: node.x, y: node.y })
  }, [node.x, node.y])

  return (
    <>
      <article
        className="notion-node-list-item"
        key={node.id}
        onClick={onListItemClick}
      >
        <p>{node.title}</p>
      </article>
      {isDropdownOpen ? (
        <div
          style={{
            width: `100%`,
          }}
        >
          <button className="button" onClick={openNotionPageOnClick}>
            open page
          </button>
          <button className="button" onClick={onNavigateToNode}>
            navigate
          </button>
          <pre style={preStyle}>{JSON.stringify(node, undefined, 2)}</pre>
        </div>
      ) : null}
    </>
  )
})()

// eslint-disable-next-line @typescript-eslint/ban-types
export const Example: FC<{}> = enhance<{}>(() => {
  const canvasElement = useRef<null | HTMLCanvasElement>(null)
  const [errors, setErrors] = useState<Errors[]>()
  const [loadStatuses, setLoadStatuses] = useState<
    Record<keyof typeof LoadStatus, boolean>
  >({
    [LoadStatus.IMPORT_LIB]: false,
    [LoadStatus.FETCH_DATA]: false,
    [LoadStatus.DB]: false,
    [LoadStatus.LABEL]: true,
    [LoadStatus.LAYOUT]: false,
  })
  const [clickedAndLinkedNodes, setClickedAndLinkedNodes] = useState<{
    node: WithCoords<Node>
    linkedNodes: WithCoords<Node>[]
  }>()
  const knowledgeGraphRef = useRef<KnowledgeGraph<Node, Link> | null>(null)
  useEffect(() => {
    ;(async () => {
      if (!canvasElement.current) return
      const [err, imported] = await tcAsync(import(`@graphcentral/graph`))
      if (err || !imported) {
        setErrors((prev) =>
          prev ? [...prev, Errors.IMPORT_FAILED] : [Errors.IMPORT_FAILED]
        )
        return
      }
      setLoadStatuses((prev) => ({
        ...prev,
        [LoadStatus.IMPORT_LIB]: true,
      }))

      const { KnowledgeGraph } = imported
      const sampleDataResp = await fetch(
        // `https://raw.githubusercontent.com/9oelM/datastore/main/prelayout-true-nodes-100000-links-118749.json`
        // `https://raw.githubusercontent.com/9oelM/datastore/main/3000ish.json`
        `https://raw.githubusercontent.com/9oelM/datastore/main/notion-help-docs.json`
        // `https://raw.githubusercontent.com/9oelM/datastore/main/prelayout-true-nodes-5100-links-6249.json`
      )
      const [sampleDataJsonErr, sampleDataJson] = await tcAsync<{
        nodes: Node[]
        links: Link[]
      }>(sampleDataResp.json())

      if (sampleDataJsonErr || !sampleDataJson) {
        setErrors((prev) =>
          prev
            ? [...prev, Errors.FETCH_TEST_DATA_FAILED]
            : [Errors.FETCH_TEST_DATA_FAILED]
        )

        return
      }
      setLoadStatuses((prev) => ({
        ...prev,
        [LoadStatus.FETCH_DATA]: true,
      }))
      const { nodes, links } = sampleDataJson
      const knowledgeGraph = new KnowledgeGraph({
        nodes: nodes,
        links: links,
        canvasElement: canvasElement.current,
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
      knowledgeGraphRef.current = knowledgeGraph
      knowledgeGraph.createNetworkGraph()
      knowledgeGraph.graphEventEmitter.on(`finishDb`, () => {
        setLoadStatuses((prevStatuses) => ({
          ...prevStatuses,
          [LoadStatus.DB]: true,
        }))
      })
      knowledgeGraph.graphEventEmitter.on(`finishLayout`, () => {
        setLoadStatuses((prevStatuses) => ({
          ...prevStatuses,
          [LoadStatus.LAYOUT]: true,
        }))
      })
      knowledgeGraph.graphEventEmitter.on(`finishLabels`, () => {
        setLoadStatuses((prevStatuses) => ({
          ...prevStatuses,
          [LoadStatus.LABEL]: true,
        }))
      })
      knowledgeGraph.graphEventEmitter.on(`startLabels`, () => {
        setLoadStatuses((prevStatuses) => ({
          ...prevStatuses,
          [LoadStatus.LABEL]: false,
        }))
      })
      knowledgeGraph.graphEventEmitter.on(`clickNode`, setClickedAndLinkedNodes)
    })()
  }, [])

  return (
    <main
      style={{
        display: `flex`,
        background: `#101010`,
        width: `100%`,
        height: `100%`,
      }}
    >
      <canvas ref={canvasElement} />
      {clickedAndLinkedNodes ? (
        <section
          style={{
            width: `300px`,
            height: `100%`,
            position: `absolute`,
            top: 0,
            left: 0,
            background: `rgba(24, 24, 24, 0.7)`,
            overflowY: `auto`,
          }}
        >
          {<h2>Clicked:</h2>}
          <NotionNodeListItem
            node={clickedAndLinkedNodes.node}
            knowledgeGraphRef={knowledgeGraphRef}
          />
          {<h2>Linked:</h2>}
          {clickedAndLinkedNodes?.linkedNodes.map((node) => {
            return (
              <NotionNodeListItem
                key={node.id}
                node={node}
                knowledgeGraphRef={knowledgeGraphRef}
              />
            )
          })}
        </section>
      ) : null}
      <section
        style={{
          position: `absolute`,
          top: 0,
          right: `150px`,
          width: `180px`,
        }}
      >
        {Object.entries(loadStatuses).map(([loadTarget, isLoaded]) => {
          if (isLoaded) {
            return null
          }
          return (
            <p key={loadTarget} className="loading-text">
              {LoadStatusToText[loadTarget as keyof typeof LoadStatus]}
            </p>
          )
        })}
      </section>
    </main>
  )
})(ExampleFallback)
