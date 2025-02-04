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
import { getQueryParams } from "../../utilities/query-params"

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
      const graphInfo: {
        graphDataUrl: string
        runForceLayout?: boolean
        useParticleContainer?: boolean
        useShadowContainer?: boolean
      } = (() => {
        const queryParams = getQueryParams()
        const test = queryParams[`graph_data`]
        switch (test) {
          case `huge`: {
            return {
              useParticleContainer: true,
              useShadowContainer: true,
              graphDataUrl: `https://raw.githubusercontent.com/9oelM/datastore/main/prelayout-true-nodes-100000-links-118749.json`,
            }
          }
          case `big`: {
            return {
              useParticleContainer: true,
              useShadowContainer: true,
              graphDataUrl: `https://raw.githubusercontent.com/9oelM/datastore/main/prelayout-true-nodes-50000-links-49999.json`,
            }
          }
          case `5000`: {
            return {
              graphDataUrl: `https://raw.githubusercontent.com/9oelM/datastore/main/prelayout-true-nodes-5100-links-6249.json`,
            }
          }
          case `notion_docs`:
          default:
            return {
              runForceLayout: false,
              graphDataUrl: `https://raw.githubusercontent.com/9oelM/datastore/main/prelayout-true-notion-help-docs.json`,
            }
        }
      })()
      const sampleDataResp = await fetch(graphInfo.graphDataUrl)
      // `https://raw.githubusercontent.com/9oelM/datastore/main/3000ish.json`
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
            useParticleContainer: Boolean(graphInfo.useParticleContainer),
            useShadowContainer: Boolean(graphInfo.useShadowContainer),
            showEdgesOnCloseZoomOnly: true,
            useMouseHoverEffect: true,
            maxTargetFPS: 60,
          },
          graph: {
            runForceLayout: Boolean(graphInfo.runForceLayout),
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

  const isFetchingData = !loadStatuses.FETCH_DATA || !loadStatuses.IMPORT_LIB

  return (
    <main
      style={{
        display: `flex`,
        background: `#101010`,
        width: `100%`,
        height: `100%`,
      }}
    >
      {isFetchingData ? (
        <div
          style={{
            position: `relative`,
          }}
        >
          <div
            style={{
              position: `absolute`,
              width: `100vw`,
              height: `100vh`,
              justifyContent: `center`,
              alignItems: `center`,
              left: 0,
              top: 0,
              display: `flex`,
              pointerEvents: `none`,
            }}
          >
            <p
              style={{
                fontSize: `2rem`,
                color: `#ffffffb0`,
              }}
            >
              Fetching data... please wait
            </p>
          </div>
        </div>
      ) : null}
      <div
        style={{
          position: `relative`,
        }}
      >
        <div
          style={{
            position: `absolute`,
            width: `100vw`,
            height: `100vh`,
            justifyContent: `center`,
            alignItems: `end`,
            left: 0,
            top: 0,
            display: `flex`,
            pointerEvents: `none`,
          }}
        >
          <p
            style={{
              fontSize: `1rem`,
              color: `#ffffffb0`,
              textAlign: `center`,
              marginBottom: `0.5rem`,
            }}
          >
            Drag/scroll to navigate and click to inspect nodes.
            <br /> Works best on desktop for now
          </p>
        </div>
      </div>
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
