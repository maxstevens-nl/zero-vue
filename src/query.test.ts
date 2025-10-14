import type { TTL } from '@rocicorp/zero'
import { createBuilder, createSchema, number, string, syncedQuery, table, Zero } from '@rocicorp/zero'
import { describe, expect, it, vi } from 'vitest'
import { createApp, nextTick, onMounted, ref, shallowRef, watchEffect } from 'vue'
import { createUseZero } from './create-use-zero'
import { createZero } from './create-zero'
import { useQuery } from './query'
import { VueView, vueViewFactory } from './view'

export function withSetup<T>(composable: () => T) {
  const result = shallowRef<T>()
  const app = createApp({
    setup() {
      onMounted(() => {
        result.value = composable()
      })

      return () => {}
    },
  })
  return [result, app] as const
}

async function setupTestEnvironment() {
  const schema = createSchema({
    tables: [
      table('table')
        .columns({
          a: number(),
          b: string(),
        })
        .primaryKey('a'),
    ],
  })
  const builder = createBuilder(schema)

  const useZero = createUseZero<typeof schema>()
  const [zero, app] = withSetup(useZero)
  app.use(createZero({
    userID: 'asdf',
    server: null,
    schema,
    // This is often easier to develop with if you're frequently changing
    // the schema. Switch to 'idb' for local-persistence.
    kvStore: 'mem',
  }))
  app.mount(document.createElement('div'))

  const z = zero.value!.value

  await z.mutate.table.insert({ a: 1, b: 'a' })
  await z.mutate.table.insert({ a: 2, b: 'b' })

  const byIdQuery = syncedQuery(
    'byId',
    ([id]) => {
      if (typeof id !== 'number') {
        throw new TypeError('id must be a number')
      }
      return [id] as const
    },
    (id: number) => {
      return builder.table.where('a', id)
    },
  )

  const tableQuery = z.query.table

  return { z, tableQuery, byIdQuery }
}

describe('useQuery', () => {
  it('useQuery', async () => {
    const { z, tableQuery } = await setupTestEnvironment()

    const { data: rows, status } = useQuery(() => tableQuery)
    expect(rows.value).toMatchInlineSnapshot(`[
  {
    "a": 1,
    "b": "a",
    Symbol(rc): 1,
  },
  {
    "a": 2,
    "b": "b",
    Symbol(rc): 1,
  },
]`)
    expect(status.value).toEqual('unknown')

    await z.mutate.table.insert({ a: 3, b: 'c' })
    await 1

    expect(rows.value).toMatchInlineSnapshot(`[
  {
    "a": 1,
    "b": "a",
    Symbol(rc): 1,
  },
  {
    "a": 2,
    "b": "b",
    Symbol(rc): 1,
  },
  {
    "a": 3,
    "b": "c",
    Symbol(rc): 1,
  },
]`)

    // TODO: this is not working at the moment, possibly because we don't have a server connection in test
    // expect(resultType.value).toEqual("complete");

    z.close()
  })

  it('useQuery with ttl (zero@0.18)', async () => {
    const { z, tableQuery } = await setupTestEnvironment()
    if (!('updateTTL' in tableQuery)) {
      // 0.19 removed updateTTL from the query
      return
    }
    const ttl = ref<TTL>('1m')

    const materializeSpy = vi.spyOn(tableQuery, 'materialize')
    // @ts-expect-error missing from v0.19+
    const updateTTLSpy = vi.spyOn(tableQuery, 'updateTTL')
    const queryGetter = vi.fn(() => tableQuery)

    useQuery(queryGetter, () => ({ ttl: ttl.value }))

    expect(queryGetter).toHaveBeenCalledTimes(1)
    expect(updateTTLSpy).toHaveBeenCalledTimes(0)
    expect(materializeSpy).toHaveBeenCalledExactlyOnceWith(
      vueViewFactory,
      '1m',
    )
    materializeSpy.mockClear()

    ttl.value = '10m'
    await 1

    expect(materializeSpy).toHaveBeenCalledTimes(0)
    expect(updateTTLSpy).toHaveBeenCalledExactlyOnceWith('10m')

    z.close()
  })

  it.only('useQuery with ttl (zero@0.19)', async () => {
    const { z, tableQuery } = await setupTestEnvironment()
    if ('updateTTL' in tableQuery) {
      // 0.19 removed updateTTL from the query
      return
    }

    const ttl = ref<TTL>('1m')

    const materializeSpy = vi.spyOn(tableQuery, 'materialize')

    const queryGetter = vi.fn(() => tableQuery)

    useQuery(queryGetter, () => ({ ttl: ttl.value }))
    expect(queryGetter).toHaveBeenCalledTimes(1)
    expect(materializeSpy).toHaveBeenCalledExactlyOnceWith(
      vueViewFactory,
      '1m',
    )
    expect(materializeSpy).toHaveLastReturnedWith(expect.any(VueView))
    const view: VueView<unknown> = materializeSpy.mock.results[0]!.value
    const updateTTLSpy = vi.spyOn(view, 'updateTTL')

    materializeSpy.mockClear()

    ttl.value = '10m'
    await 1

    expect(materializeSpy).toHaveBeenCalledTimes(0)
    expect(updateTTLSpy).toHaveBeenCalledExactlyOnceWith('10m')

    z.close()
  })

  it('useQuery deps change', async () => {
    const { z, tableQuery } = await setupTestEnvironment()

    const a = ref(1)

    const { data: rows, status } = useQuery(() =>
      tableQuery.where('a', a.value),
    )

    const rowLog: unknown[] = []
    const resultDetailsLog: unknown[] = []
    const resetLogs = () => {
      rowLog.length = 0
      resultDetailsLog.length = 0
    }

    watchEffect(() => {
      rowLog.push(rows.value)
    })

    watchEffect(() => {
      resultDetailsLog.push(status.value)
    })

    expect(rowLog).toMatchInlineSnapshot(`[
  [
    {
      "a": 1,
      "b": "a",
      Symbol(rc): 1,
    },
  ],
]`)
    // expect(resultDetailsLog).toEqual(["unknown"]);
    resetLogs()

    expect(rowLog).toEqual([])
    // expect(resultDetailsLog).toEqual(["complete"]);
    resetLogs()

    a.value = 2
    await 1

    expect(rowLog).toMatchInlineSnapshot(`[
  [
    {
      "a": 2,
      "b": "b",
      Symbol(rc): 1,
    },
  ],
]`)
    // expect(resultDetailsLog).toEqual(["unknown"]);
    resetLogs()

    expect(rowLog).toEqual([])
    // expect(resultDetailsLog).toEqual(["complete"]);

    z.close()
  })

  it('useQuery deps change watchEffect', async () => {
    const { z, tableQuery } = await setupTestEnvironment()
    const a = ref(1)
    const { data: rows } = useQuery(() => tableQuery.where('a', a.value))

    let run = 0

    await new Promise((resolve) => {
      watchEffect(() => {
        if (run === 0) {
          expect(rows.value).toMatchInlineSnapshot(
            `[
  {
    "a": 1,
    "b": "a",
    Symbol(rc): 1,
  },
]`,
          )
          z.mutate.table.update({ a: 1, b: 'a2' })
        }
        else if (run === 1) {
          expect(rows.value).toMatchInlineSnapshot(
            `[
  {
    "a": 1,
    "b": "a2",
    Symbol(rc): 1,
  },
]`,
          )
          a.value = 2
        }
        else if (run === 2) {
          expect(rows.value).toMatchInlineSnapshot(
            `[
  {
    "a": 2,
    "b": "b",
    Symbol(rc): 1,
  },
]`,
          )
          resolve(true)
        }
        run++
      })
    })

    z.close()
  })

  it.skip('useQuery with syncedQuery', async () => {
    const { z, byIdQuery } = await setupTestEnvironment()

    const a = ref(1)
    const { data: rows, status } = useQuery(() => byIdQuery(a.value))

    expect(rows.value).toMatchInlineSnapshot(`
[
  {
    "a": 1,
    "b": "a",
    Symbol(rc): 1,
  },
]`)
    expect(status.value).toEqual('unknown')

    z.close()
  })
})
