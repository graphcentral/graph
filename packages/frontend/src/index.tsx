import React from "react"
import { MainPagePure } from "src/pages/Main"
import { createRoot } from "react-dom/client"
import "./index.css"

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById(`root`)!).render(<MainPagePure />)
