import React, { useEffect, useLayoutEffect, useRef } from "react"
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
  enhance<ExampleImpureProps>(() => {
    const canvasElement = useRef<null | HTMLCanvasElement>(null)
    useLayoutEffect(() => {
      console.log(testData.nodes.length)
      if (!canvasElement.current) return
    }, [])

    return <canvas ref={canvasElement}></canvas>
  })(ExampleFallback)

// // eslint-disable-next-line @typescript-eslint/ban-types
// export type ExamplePureProps = {
//   canvasElement: React.MutableRefObject<HTMLCanvasElement | null>
// }

// export const ExamplePure: FC<ExamplePureProps> = enhance<ExamplePureProps>(
//   ({ canvasElement }) => <canvas ref={canvasElement}></canvas>
// )(ExampleFallback)
