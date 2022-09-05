export const enum WorkerMessageType {
  START_GRAPH = `START_GRAPH`,
  UPDATE_NODES = `UPDATE_NODES`,
  UPDATE_LINKS = `UPDATE_LINKS`,
  /**
   * to be called only once when the graph is fully loaded
   * from the worker's side
   */
  FINISH_GRAPH = `FINISH_GRAPH`,
  /**
   * to be only used when `runForceLayout: false`.
   * input nodes and links must be of the type produced by
   * d3-force.
   */
  UPDATE_NODE_CHILDREN = `UPDATE_NODE_CHILDREN`,
}

export const enum GraphEvents {
  CLICK_NODE = `CLICK_NODE`,
  /**
   * Whenever a user moves around
   * labels are shown in that area.
   * To query the labels, some loading is needed
   * This event gets fired at times when user moves around
   * in the screen
   */
  START_LABELS = `START_LABELS`,
  FINISH_LABELS = `FINISH_LABELS`,
  /**
   * Called when loading layout finishes
   * IndexedDB may not be loaded yet.
   * This event only gets called once
   */
  START_LAYOUT = `START_LAYOUT`,
  FINISH_LAYOUT = `FINISH_LAYOUT`,
  /**
   * Called when loading the entire graph finishes
   * this means both layout and db have been initialized
   * This event only gets called once
   */
  FINISH_GRAPH = `FINISH_GRAPH`,
  /**
   * Finish bulk insaerting initial data into the database
   * This event only gets called once
   */
  FINISH_DB = `FINISH_DB`,
  ERROR = `ERROR`,
}

export enum GraphGraphics {
  CIRCLE_SIZE = 50,
  CIRCLE_SCALE_FACTOR = 1.5,
}

/**
 *  decreases as user zooms out
 */
export enum GraphScales {
  MIN_ZOOM = 0.0440836883806951,
  MID_ZOOM = 0.013,
  MAX_ZOOM = 0.00949999848460085,
}

export enum GraphZIndex {
  NORMAL_CONTAINER_CIRCLE = 100,
  TEXT = 200,
  SELECTED_CIRCLE_OUTLINE_FEEDBACK = 300,
  HIGHLIGHTING_CIRCLE = 300,
}

export const RENDER_ALL = `RENDER_ALL` as const
