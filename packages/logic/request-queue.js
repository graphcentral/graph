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
exports.RequestQueue = void 0;
const await_to_js_1 = __importDefault(require("await-to-js"));
const events_1 = __importDefault(require("events"));
/**
 * https://developers.notion.com/reference/request-limits
 * Notion API has a request limit
 * So use a simple request queue to control number of concurrent requests
 */
class RequestQueue {
    constructor({ maxConcurrentRequest }) {
        this.queue = [];
        this.responses = [];
        this.currentRequestCount = 0;
        this.maxConcurrentRequest = -1;
        this.eventEmitter = new events_1.default();
        this.intervalId = null;
        if (maxConcurrentRequest <= 0) {
            throw new Error(`maxConcurrentRequest must be bigger than 0`);
        }
        this.maxConcurrentRequest = maxConcurrentRequest;
        this.checkAndSendRequest();
    }
    /**
     * This function is used to periodically check the number of concurrent
     * requests at a time and send the request if the number of concurrent requests
     * is less than `maxConcurrentRequest`.
     *
     * If there are no more requests to send, it will emit `complete` event and terminate.
     */
    checkAndSendRequest() {
        let timeoutId = null;
        let totalRequestCount = 0;
        const run = () => {
            console.log(`# current requests: ${this.currentRequestCount} / # items in the queue: ${this.queue.length}`);
            console.log(`# total requests sent: ${totalRequestCount}`);
            // if things seem to be completed, check again after 1 second,
            // and if it is empty, that means new request has not been sent anymore
            // which means every request has been sent and there's no more work to do
            if (this.currentRequestCount === 0 && this.queue.length === 0) {
                timeoutId = setTimeout(() => {
                    // this line is needed! it's not a mistake
                    if (this.currentRequestCount === 0 && this.queue.length === 0) {
                        this.eventEmitter.emit(`complete`, this.responses);
                        if (this.intervalId)
                            clearInterval(this.intervalId);
                    }
                }, 1000);
            }
            if (!(this.currentRequestCount === 0 && this.queue.length === 0) &&
                this.currentRequestCount < this.maxConcurrentRequest) {
                if (timeoutId !== null)
                    clearTimeout(timeoutId);
                while (this.currentRequestCount < this.maxConcurrentRequest) {
                    ++totalRequestCount;
                    this.sendRequest()
                        .catch((err) => {
                        this.responses.push(err);
                    })
                        .then((res) => {
                        if (res)
                            this.responses.push(res);
                    })
                        .finally(() => {
                        --this.currentRequestCount;
                    });
                    ++this.currentRequestCount;
                }
            }
        };
        run();
        this.intervalId = setInterval(run, 300);
    }
    sendRequest() {
        return __awaiter(this, void 0, void 0, function* () {
            const req = this.queue.shift();
            if (req === undefined) {
                return null;
            }
            const [err, res] = yield (0, await_to_js_1.default)(req());
            if (res === undefined || err !== null) {
                return err;
            }
            return res;
        });
    }
    /**
     * User only has to enqueue his request here and RequestQueue will take
     * care of the rest.
     * @param retriveBlockRequestFn
     * any function that returns a promise (i.e. sends an async request)
     */
    enqueue(retriveBlockRequestFn) {
        this.queue.push(retriveBlockRequestFn);
    }
    /**
     * @param listener any callback to be called when RequestQueue finishes its work
     * and meaning that the queue is empty
     */
    onComplete(listener) {
        this.eventEmitter.on(`complete`, listener);
    }
}
exports.RequestQueue = RequestQueue;
