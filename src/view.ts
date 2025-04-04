// based on https://github.com/rocicorp/mono/tree/main/packages/zero-solid

import type {
  Change,
  Entry,
  Format,
  HumanReadable,
  Input,
  Output,
  Query,
  ResultType,
  Schema,
  ViewFactory,
} from '@rocicorp/zero'
import { applyChange } from '@rocicorp/zero'
import { reactive } from 'vue'

interface QueryResultDetails {
  readonly type: ResultType
}

const complete = { type: 'complete' } as const
const unknown = { type: 'unknown' } as const

export class VueView<V> implements Output {
  readonly #input: Input
  readonly #format: Format
  readonly #onDestroy: () => void

  #data: Entry
  #status: QueryResultDetails

  constructor(
    input: Input,
    onTransactionCommit: (cb: () => void) => void,
    format: Format = { singular: false, relationships: {} },
    onDestroy: () => void = () => {},
    queryComplete: true | Promise<true>,
  ) {
    this.#input = input
    this.#format = format
    this.#onDestroy = onDestroy
    this.#data = reactive({ '': format.singular ? undefined : [] })
    this.#status = queryComplete === true ? complete : unknown
    input.setOutput(this)

    for (const node of input.fetch({})) {
      this.#applyChange({ type: 'add', node })
    }

    if (queryComplete !== true) {
      void queryComplete.then(() => {
        this.#status = complete
      })
    }
  }

  get data() {
    return this.#data[''] as V
  }

  get status() {
    return this.#status.type
  }

  destroy() {
    this.#onDestroy()
  }

  #applyChange(change: Change): void {
    applyChange(this.#data, change, this.#input.getSchema(), '', this.#format)
  }

  push(change: Change): void {
    this.#applyChange(change)
  }
}

export function vueViewFactory<
  TSchema extends Schema,
  TTable extends keyof TSchema['tables'] & string,
  TReturn,
>(
  _query: Query<TSchema, TTable, TReturn>,
  input: Input,
  format: Format,
  onDestroy: () => void,
  onTransactionCommit: (cb: () => void) => void,
  queryComplete: true | Promise<true>,
) {
  return new VueView<HumanReadable<TReturn>>(
    input,
    onTransactionCommit,
    format,
    onDestroy,
    queryComplete,
  )
}

vueViewFactory satisfies ViewFactory<Schema, string, unknown, unknown>
