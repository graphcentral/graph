"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UndirectedNodesGraph = void 0;
/**
 * d3.js uses `source: ... target: ...` format to abstract
 * the concept of an edge.
 */
class D3JsEdge {
    constructor({ source, target, }) {
        this.source = source;
        this.target = target;
    }
}
/**
 * Represents an undirected graph of nodes.
 */
class UndirectedNodesGraph {
    constructor() {
        this.graph = {};
    }
    /**
     * Adds an edge between two nodes, but avoids making duplicates
     * if the edge already exists
     */
    addEdge(node0, node1) {
        // node0 may already have node1, but we just update it anyway
        let node0Edges = this.graph[node0.id];
        const node1Edges = this.graph[node1.id];
        // check if edge already exists in node1Edges
        if (node1Edges && node1Edges[node0.id]) {
            // if edge already exists, return
            return;
        }
        // otherwise, add a new edge to node0
        if (!node0Edges)
            node0Edges = {};
        node0Edges[node1.id] = true;
        this.graph[node0.id] = node0Edges;
    }
    getGraph() {
        return this.graph;
    }
    /**
     * transform `this.graph` to d3.js edge (link) shape.
     * The output will be used directly in frontend
     */
    getD3JsEdgeFormat() {
        const d3JsEdges = [];
        Object.keys(this.graph).map((nodeId) => {
            const edges = this.graph[nodeId];
            if (!edges)
                return;
            for (const edge of Object.keys(edges)) {
                d3JsEdges.push(new D3JsEdge({
                    source: nodeId,
                    target: edge,
                }));
            }
        });
        return d3JsEdges;
    }
}
exports.UndirectedNodesGraph = UndirectedNodesGraph;
