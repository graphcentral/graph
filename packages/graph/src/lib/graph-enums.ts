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

  INIT_GRAPH_COMPUTATION_WORKER = `INIT_GRAPH_COMPUTATION_WORKER`,
  UPDATE_VISIBLE_NODES = `UPDATE_VISIBLE_NODES`,
}

export const enum GraphEvents {
  FORCE_LAYOUT_COMPLETE = `FORCE_LAYOUT_COMPLETE`,
  LOAD_GRAPH_COMPLETE = `LOAD_GRAPH_COMPLETE`,
  INIT_DB_COMPLETE = `INIT_DB_COMPLETE`,
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
  CAN_SEE_BIG_NODES_WELL = 0.0940836883806951,
  CANNOT_SEE_ANYTHING_WELL = 0.00449999848460085,
}

export enum GraphZIndex {
  NORMAL_CONTAINER_CIRCLE = 100,
  TEXT = 200,
  SELECTED_CIRCLE_OUTLINE_FEEDBACK = 300,
  HIGHLIGHTING_CIRCLE = 300,
}

export const RENDER_ALL = `RENDER_ALL` as const
