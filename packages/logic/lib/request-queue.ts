import to from "await-to-js"
import EventEmitter from "events"

/**
 * https://developers.notion.com/reference/request-limits
 * Notion API has a request limit
 * also, although we are using unofficial API,
 * it's a good idea not to overload the server too much anyway
 * So use a simple request queue to control number of concurrent requests
 */
export class RequestQueue<Res, Err> {
  private queue: (() => Promise<Res>)[] = []
  private responses: (Res | Err)[] = []
  private currentRequestCount = 0
  private maxConcurrentRequest = -1
  private eventEmitter = new EventEmitter()
  private lastRequestTimeoutMs: number
  private intervalId: NodeJS.Timer | null = null
  private hasNoMoreRequestEnqueued = false

  constructor({
    maxConcurrentRequest,
    lastRequestTimeoutMs = 15_000,
  }: {
    maxConcurrentRequest: number
    /**
     * default: 15000 ms
     */
    lastRequestTimeoutMs?: number
  }) {
    if (maxConcurrentRequest <= 0) {
      throw new Error(`maxConcurrentRequest must be bigger than 0`)
    }
    this.maxConcurrentRequest = maxConcurrentRequest
    this.lastRequestTimeoutMs = lastRequestTimeoutMs
    this.checkAndSendRequest()
  }

  private terminateIfPossible() {
    if (this.currentRequestCount === 0 && this.queue.length === 0) {
      this.eventEmitter.emit(`complete`, this.responses)
      if (this.intervalId) clearInterval(this.intervalId)
    }
  }

  /**
   * This function is used to periodically check the number of concurrent
   * requests at a time and send the request if the number of concurrent requests
   * is less than `maxConcurrentRequest`.
   *
   * If there are no more requests to send, it will emit `complete` event and terminate.
   */
  private checkAndSendRequest() {
    let timeoutIds: NodeJS.Timeout[] = []
    let totalRequestCount = 0
    const run = () => {
      console.log(
        `# current requests: ${this.currentRequestCount} / # items in the queue: ${this.queue.length}`
      )
      console.log(`# total requests sent: ${totalRequestCount}`)

      if (
        !(this.currentRequestCount === 0 && this.queue.length === 0) &&
        this.currentRequestCount < this.maxConcurrentRequest
      ) {
        while (this.currentRequestCount < this.maxConcurrentRequest) {
          ++totalRequestCount

          timeoutIds.forEach((id) => clearTimeout(id))
          timeoutIds = []
          this.sendRequest()
            .catch((err: Err) => {
              this.responses.push(err)
            })
            .then((res) => {
              if (res) this.responses.push(res)
            })
            .finally(() => {
              --this.currentRequestCount
              // if it is clear that no more requests will be enqueued,
              // check if the function can end right away
              if (this.hasNoMoreRequestEnqueued) {
                console.log(`terminate #1`)
                this.terminateIfPossible()
              }
              timeoutIds.push(
                setTimeout(() => {
                  // if things seem to be completed, check again after 1 second,
                  // and if it is empty, that means new request has not been sent anymore
                  // which means every request has been sent and there's no more work to do

                  console.log(`terminate #2`)
                  this.terminateIfPossible()
                }, this.lastRequestTimeoutMs)
              )
            })
          ++this.currentRequestCount
        }
      }
    }
    run()
    this.intervalId = setInterval(run, 50)
  }

  private async sendRequest(): Promise<null | Res | Err> {
    const req = this.queue.shift()

    if (req === undefined) {
      return null
    }
    const [err, res] = await to<Res, Err>(req())

    if (res === undefined || err !== null) {
      return err
    }

    return res
  }

  /**
   * Let RequestQueue know that there is going to be no more
   * request input from the user.
   *
   * This is important because RequestQueue will be able to quit
   * immediately after the last request completes knowing that
   * no more requests will be enqueued.
   */
  public setNoMoreRequestEnqueued() {
    this.hasNoMoreRequestEnqueued = true
  }

  /**
   * User only has to enqueue his request here and RequestQueue will take
   * care of the rest.
   * @param retriveBlockRequestFn
   * any function that returns a promise (i.e. sends an async request)
   */
  public enqueue(retriveBlockRequestFn: () => Promise<Res>) {
    this.queue.push(retriveBlockRequestFn)
  }

  /**
   * @param listener any callback to be called when RequestQueue finishes its work
   * and meaning that the queue is empty
   */
  public onComplete<Fn extends (...args: any[]) => void>(listener: Fn) {
    this.eventEmitter.on(`complete`, listener)

    this.queue = []
    this.responses = []
  }
}
