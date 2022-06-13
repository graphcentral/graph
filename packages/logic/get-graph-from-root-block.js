"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGraphFromRootBlock = void 0;
const await_to_js_1 = __importDefault(require("await-to-js"));
const request_queue_1 = require("./request-queue");
const nodes_graph_1 = require("./types/nodes-graph");
const util_1 = require("./util");
function blockTypeToNotionContentNodeType(blockType) {
    switch (blockType) {
        case `child_database`:
            return `database`;
        case `child_page`:
            return `page`;
        default:
            return `error`;
    }
}
/**
 *
 * @param notion notion client
 * @param rootBlockId the id of a root page or database
 * @returns `null` on error. Otherwise `database` or `page`
 */
function retrieveRootNode(notion, rootBlockId) {
    return __awaiter(this, void 0, void 0, function* () {
        const [err, blockInfo] = yield (0, await_to_js_1.default)(notion.blocks.retrieve({
            block_id: (0, util_1.separateIdWithDashSafe)(rootBlockId),
        }));
        if (err || !blockInfo) {
            return null;
        }
        return {
            type: blockTypeToNotionContentNodeType(
            // @ts-ignore: sdk bad typing
            blockInfo.type),
            id: (0, util_1.separateIdWithDashSafe)(rootBlockId),
            title: (0, util_1.identifyObjectTitle)(blockInfo),
        };
    });
}
/**
 *
 * @param notion
 * @param parentNode
 * @returns `null` on error, otherwise databaseChildren OR pageChildren
 */
function retrieveDatabaseOrPageChildren(notion, parentNode) {
    return __awaiter(this, void 0, void 0, function* () {
        let pageChildren = null;
        let databaseChildren = null;
        switch (parentNode.type) {
            case `database`: {
                const [err, databaseChildrenQueryResult] = yield (0, await_to_js_1.default)(notion.databases.query({
                    database_id: (0, util_1.separateIdWithDashSafe)(parentNode.id),
                    page_size: 50,
                }));
                if (databaseChildrenQueryResult) {
                    databaseChildren = databaseChildrenQueryResult;
                }
                if (err)
                    console.log(err);
                break;
            }
            case `page`: {
                const [err, pageChildrenListResult] = yield (0, await_to_js_1.default)(notion.blocks.children.list({
                    block_id: (0, util_1.separateIdWithDashSafe)(parentNode.id),
                    page_size: 50,
                }));
                if (pageChildrenListResult) {
                    pageChildren = pageChildrenListResult;
                }
                if (err)
                    console.log(err);
            }
        }
        // something went wrong
        if (!databaseChildren && !pageChildren) {
            return null;
        }
        return {
            databaseChildren,
            pageChildren,
        };
    });
}
function createNotionContentNodeFromPageChild(pageChild) {
    return {
        title: (0, util_1.identifyObjectTitle)(pageChild),
        id: pageChild.id,
        // @ts-ignore: sdk doesn't support good typing
        type: blockTypeToNotionContentNodeType(
        // @ts-ignore: sdk doesn't support good typing
        pageChild.type),
    };
}
function createNotionContentNodeFromDatabaseChild(databaseChild) {
    return {
        title: (0, util_1.identifyObjectTitle)(databaseChild),
        id: databaseChild.id,
        type: databaseChild.object,
    };
}
/**
 * Notion API currently does not support getting all children of a page at once
 * so the only way is to recursively extract all pages and databases from the root block (page or database)
 * @param notion Notion client
 * @param rootBlockId the id of the root page or database.
 * Either format of 1429989fe8ac4effbc8f57f56486db54 or
 * 1429989f-e8ac-4eff-bc8f-57f56486db54 are all fine.
 * @returns all recurisvely discovered children of the root page
 */
function getGraphFromRootBlock(notion, rootBlockId) {
    return __awaiter(this, void 0, void 0, function* () {
        const rootNode = yield retrieveRootNode(notion, rootBlockId);
        if (!rootNode) {
            throw new Error(`Error while retrieving rootNode`);
        }
        const nodes = [rootNode];
        const nodesGraph = new nodes_graph_1.UndirectedNodesGraph();
        const requestQueue = new request_queue_1.RequestQueue({ maxConcurrentRequest: 50 });
        function retrieveNodesRecursively(parentNode) {
            return __awaiter(this, void 0, void 0, function* () {
                const queryChild = (child) => {
                    requestQueue.enqueue(() => retrieveNodesRecursively(child));
                };
                const processNewBlock = (newBlock) => {
                    nodesGraph.addEdge(parentNode, newBlock);
                    nodes.push(newBlock);
                    queryChild(newBlock);
                };
                const databaseOrPageChildren = yield retrieveDatabaseOrPageChildren(notion, parentNode);
                if (!databaseOrPageChildren) {
                    return;
                }
                const { pageChildren, databaseChildren } = databaseOrPageChildren;
                if (pageChildren) {
                    for (const child of pageChildren.results) {
                        try {
                            // @ts-ignore: sdk doesn't support good typing
                            if (child.type === `child_database` || child.type === `child_page`) {
                                const newBlock = createNotionContentNodeFromPageChild(child);
                                processNewBlock(newBlock);
                            }
                        }
                        catch (e) {
                            console.log(e);
                            console.log(`e`);
                        }
                    }
                }
                else if (databaseChildren) {
                    for (const child of databaseChildren.results) {
                        try {
                            const newBlock = createNotionContentNodeFromDatabaseChild(child);
                            processNewBlock(newBlock);
                        }
                        catch (e) {
                            console.log(e);
                            console.log(`e`);
                        }
                    }
                }
            });
        }
        const [err] = yield (0, await_to_js_1.default)(Promise.allSettled([
            retrieveNodesRecursively(rootNode),
            new Promise((resolve) => {
                requestQueue.onComplete(resolve);
            }),
        ]));
        if (err) {
            throw err;
        }
        return {
            nodes,
            links: nodesGraph.getD3JsEdgeFormat(),
        };
    });
}
exports.getGraphFromRootBlock = getGraphFromRootBlock;
