import type { CustomMutatorDefs, Query, Schema, ZeroOptions } from '@rocicorp/zero'
import type { MaybeRefOrGetter, ShallowRef } from 'vue'
import type { QueryResult, UseQueryOptions } from './query'
import { Zero } from '@rocicorp/zero'
import { shallowRef, toValue, watch } from 'vue'
import { useQuery } from './query'

const zeroCleanups = new Set()

export function createZero<S extends Schema = Schema, MD extends CustomMutatorDefs | undefined = undefined>(optsOrZero: MaybeRefOrGetter<ZeroOptions<S, MD> | { zero: Zero<S, MD> }>) {
  const z = shallowRef() as ShallowRef<Zero<S, MD>>

  const opts = toValue(optsOrZero)
  z.value = 'zero' in opts ? opts.zero : new Zero(opts)

  watch(() => toValue(optsOrZero), (opts) => {
    const cleanupZeroPromise = z.value.close()
    zeroCleanups.add(cleanupZeroPromise)
    cleanupZeroPromise.finally(() => {
      zeroCleanups.delete(cleanupZeroPromise)
    })

    z.value = 'zero' in opts ? opts.zero : new Zero(opts)
  }, { deep: true })

  function useQueryWrap<
    TTable extends keyof S['tables'] & string,
    TReturn,
  >(
    query: MaybeRefOrGetter<Query<S, TTable, TReturn>>,
    options?: MaybeRefOrGetter<UseQueryOptions>,
  ): QueryResult<TReturn> {
    return useQuery(z, query, options)
  }

  return {
    useZero: () => z,
    useQuery: useQueryWrap,
  }
}
