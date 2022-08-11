import * as PIXI from "pixi.js"

export const setupFpsMonitor = (app: PIXI.Application) => {
  const fpsMonitor = document.createElement(`div`)
  fpsMonitor.setAttribute(
    `style`,
    `position: absolute; width: 10px; height: 5px; backgroundColor: black; color: white; right: 10px; top: 0;`
  )
  setInterval(() => {
    fpsMonitor.textContent = app.ticker.FPS.toFixed(0)
  }, 100)

  document.body.append(fpsMonitor)
}
