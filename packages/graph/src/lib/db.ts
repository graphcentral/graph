import Dexie, {
  IndexableType,
  Table,
  Transaction,
  TransactionMode,
} from "dexie"
import { Link, Node, WithCoords } from "./types"

// https://dexie.org/docs/Typescript
export class KnowledgeGraphDb extends Dexie {
  // Declare implicit table properties.
  // (just to inform Typescript. Instanciated by Dexie in stores() method)
  nodes!: Dexie.Table<WithCoords<Node>, string> // number = type of the primkey
  links!: Dexie.Table<
    { source: WithCoords<Link[`source`]>; target: WithCoords<Link[`target`]> },
    number
  >
  // eslint-disable-next-line @typescript-eslint/ban-types
  visibleNodes!: Dexie.Table<{}, string>
  //...other tables goes here...

  constructor() {
    super(`kgDb`)
    this.version(1).stores({
      nodes: `id, title, parentId, cc, type, x, y, [cc+x+y]`,
      links: `++id, source, target`,
      visibleNodes: `id`,
    })
  }

  public cancellableTx<Returns>(
    transactionMode: TransactionMode,
    includedTables: Table<any, IndexableType>[],
    querierFunction: (...params: any[]) => Promise<Returns>
  ) {
    let tx: Transaction | null = null
    let cancelled = false
    const transaction = this.transaction(
      transactionMode,
      includedTables,
      () => {
        if (cancelled) throw new Dexie.AbortError(`Query was cancelled`)
        tx = Dexie.currentTransaction
        return querierFunction()
      }
    )
    return {
      transaction,
      cancel: () => {
        cancelled = true // In case transaction hasn't been started yet.
        if (tx) tx.abort() // If started, abort it.
        tx = null // Avoid calling abort twice.
      },
    }
  }
}
