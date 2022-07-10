import React, { useEffect } from "react"
import { FC } from "react"
import { createNetworkGraph } from "../../lib/createNetworkGraph"
import { enhance } from "../../utilities/essentials"
import { ExampleFallback } from "./fallback"
import testData from "../../../../test-data/test6.json"

// eslint-disable-next-line @typescript-eslint/ban-types
export type ExampleImpureProps = {
  color: string
}

export const ExampleImpure: FC<ExampleImpureProps> =
  enhance<ExampleImpureProps>(({ color }) => {
    useEffect(() => {
      console.log(testData.nodes.length)
      createNetworkGraph({
        nodes: testData.nodes,
        links: testData.links,
      })
    }, [])

    return <ExamplePure color={color}></ExamplePure>
  })(ExampleFallback)

// eslint-disable-next-line @typescript-eslint/ban-types
export type ExamplePureProps = {
  color: string
}

export const ExamplePure: FC<ExamplePureProps> = enhance<ExamplePureProps>(
  ({ color, children }) => (
    <div>
      <p
        style={{
          color,
        }}
      >
        {children}
      </p>
    </div>
  )
)(ExampleFallback)
