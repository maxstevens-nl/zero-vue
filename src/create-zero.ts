import type { CustomMutatorDefs, Query, Schema, ZeroOptions } from '@rocicorp/zero'
import type { MaybeRefOrGetter, ShallowRef } from 'vue'
import type { QueryResult, UseQueryOptions } from './query'
import { Zero } from '@rocicorp/zero'
import { shallowRef, toValue, watch } from 'vue'
import { useQueryWithZero } from './query'

const zeroCleanups = new Set()

export function createZero<S extends Schema = Schema, MD extends CustomMutatorDefs | undefined = undefined>(optsOrZero: MaybeRefOrGetter<ZeroOptions<S, MD> | { zero: Zero<S, MD> }>) {
  const z = shallowRef() as ShallowRef<Zero<S, MD>>

  function useZero() {
    if (z.value) {
      return z
    }

    watch(() => toValue(optsOrZero), (opts) => {
      if (z.value && !z.value.closed) {
        const cleanupZeroPromise = z.value.close()
        zeroCleanups.add(cleanupZeroPromise)
        cleanupZeroPromise.finally(() => {
          zeroCleanups.delete(cleanupZeroPromise)
        })
      }

      z.value = 'zero' in opts ? opts.zero : new Zero(opts)
    }, { deep: true, immediate: true })

    return z
  }

  function useQuery<
    TTable extends keyof S['tables'] & string,
    TReturn,
  >(
    query: MaybeRefOrGetter<Query<S, TTable, TReturn>>,
    options?: MaybeRefOrGetter<UseQueryOptions>,
  ): QueryResult<TReturn> {
    const z = useZero()
    return useQueryWithZero(query, options, z)
  }

  return {
    useZero,
    useQuery,
  }
}
