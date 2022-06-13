import to from "await-to-js"
import EventEmitter from "events"

/**
 * https://developers.notion.com/reference/request-limits
 * Notion API has a request limit
 * So use a simple request queue to control number of concurrent requests
 */
export class RequestQueue<Res, Err> {
  private queue: (() => Promise<Res>)[] = []
  private responses: (Res | Err)[] = []
  private currentRequestCount = 0
  private maxConcurrentRequest = -1
  private eventEmitter = new EventEmitter()
  private intervalId: NodeJS.Timer | null = null

  constructor({ maxConcurrentRequest }: { maxConcurrentRequest: number }) {
    if (maxConcurrentRequest <= 0) {
      throw new Error(`maxConcurrentRequest must be bigger than 0`)
    }
    this.maxConcurrentRequest = maxConcurrentRequest
    this.checkAndSendRequest()
  }

  /**
   * This function is used to periodically check the number of concurrent
   * requests at a time and send the request if the number of concurrent requests
   * is less than `maxConcurrentRequest`.
   *
   * If there are no more requests to send, it will emit `complete` event and terminate.
   */
  private checkAndSendRequest() {
    let timeoutId: null | NodeJS.Timeout = null
    let totalRequestCount = 0
    const run = () => {
      console.log(
        `# current requests: ${this.currentRequestCount} / # items in the queue: ${this.queue.length}`
      )
      console.log(`# total requests sent: ${totalRequestCount}`)
      // if things seem to be completed, check again after 1 second,
      // and if it is empty, that means new request has not been sent anymore
      // which means every request has been sent and there's no more work to do
      if (this.currentRequestCount === 0 && this.queue.length === 0) {
        timeoutId = setTimeout(() => {
          // this line is needed! it's not a mistake
          if (this.currentRequestCount === 0 && this.queue.length === 0) {
            this.eventEmitter.emit(`complete`, this.responses)
            if (this.intervalId) clearInterval(this.intervalId)
          }
        }, 2_000)
      }

      if (
        !(this.currentRequestCount === 0 && this.queue.length === 0) &&
        this.currentRequestCount < this.maxConcurrentRequest
      ) {
        if (timeoutId !== null) clearTimeout(timeoutId)
        while (this.currentRequestCount < this.maxConcurrentRequest) {
          ++totalRequestCount
          this.sendRequest()
            .catch((err: Err) => {
              this.responses.push(err)
            })
            .then((res) => {
              if (res) this.responses.push(res)
            })
            .finally(() => {
              --this.currentRequestCount
            })
          ++this.currentRequestCount
        }
      }
    }
    run()
    this.intervalId = setInterval(run, 300)
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
  }
}
