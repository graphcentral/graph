import to from 'await-to-js';
import EventEmitter from 'events'

export class RequestQueue<Res, Err> {
  private queue: (() => Promise<Res>)[] = []
  private responses: (Res | Err)[] = []
  private currentRequestCount = 0
  private maxConcurrentRequest = -1
  private eventEmitter = new EventEmitter();
  private intervalId: NodeJS.Timer | null = null

  constructor({
    maxConcurrentRequest
  }: {
    maxConcurrentRequest: number;
  }) {
    if (maxConcurrentRequest <= 0) {
      throw new Error(`maxConcurrentRequest must be bigger than 0`)
    }
    this.maxConcurrentRequest = maxConcurrentRequest;
    this.checkAndSendRequest()
  }

  private checkAndSendRequest() {
    let timeoutId: null | NodeJS.Timeout = null
    const run = () => {
      if (timeoutId !== null) clearTimeout(timeoutId)
      if (this.currentRequestCount === 0 && this.queue.length === 0) {
        timeoutId = setTimeout(() => {
          this.eventEmitter.emit(`complete`, this.responses)
          if (this.intervalId) clearInterval(this.intervalId)
        }, 1_500)
      }

      if (
        (this.currentRequestCount === 0 && this.queue.length === 0) &&
        this.currentRequestCount < this.maxConcurrentRequest
      ) {
        while (this.currentRequestCount < this.maxConcurrentRequest) {
          console.log(`sending request`)
          this.sendRequest()
          .catch((err: Err) => {
            this.responses.push(err)
          })
          .then((res) => {
            console.log(res)
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
    this.intervalId = setInterval(run, 1_000)
  }

  public enqueue(retriveBlockRequestFn: () => Promise<Res>) {
    this.queue.push(retriveBlockRequestFn)
  }
  
  public async sendRequest(): Promise<null | Res> {
    const req = this.queue.shift()

    if (req === undefined) {
      return null
    } 
    const [err, res] = await to(req())
    
    if (res === undefined || err !== null) {
      return null
    }

    return res
  }

  public onComplete<Fn extends (...args: any[]) => void>(listener: Fn) {
    this.eventEmitter.on(`complete`, listener)
  }
}