import type { CustomMutatorDefs, Query, Schema, ZeroOptions } from '@rocicorp/zero'
import type { MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
import type { QueryResult, UseQueryOptions } from './query'
import { Zero } from '@rocicorp/zero'
import { getCurrentScope, onScopeDispose, ref, shallowRef, toValue, watch } from 'vue'
import { useQueryWithZero } from './query'

export function createZeroComposables<S extends Schema = Schema, MD extends CustomMutatorDefs | undefined = undefined>(optsOrZero: MaybeRefOrGetter<ZeroOptions<S, MD> | { zero: Zero<S, MD> }>) {
  let z: ShallowRef<Zero<S, MD>>
  let zeroOnline: Ref<boolean> | undefined
  let onOnlineCleanup: (() => void) | undefined

  function cleanup() {
    if (z.value) {
      void z.value.close()
    }

    if (onOnlineCleanup) {
      onOnlineCleanup()
    }
  }

  function useZero(): ShallowRef<Zero<S, MD>> {
    if (!z) {
      z = shallowRef() as ShallowRef<Zero<S, MD>>
    }

    if (z.value) {
      return z
    }

    watch(() => toValue(optsOrZero), (opts) => {
      if (z.value && !z.value.closed) {
        void z.value.close()
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
    return useQueryWithZero(z, query, options)
  }

  function useZeroOnline(): Readonly<Ref<boolean>> {
    if (zeroOnline !== undefined) {
      return zeroOnline
    }

    const z = useZero()
    zeroOnline = ref(z.value.online)

    watch(z, (z) => {
      if (onOnlineCleanup) {
        onOnlineCleanup()
      }

      zeroOnline!.value = z.online
      onOnlineCleanup = z.onOnline((online) => {
        zeroOnline!.value = online
      })
    }, { immediate: true })

    return zeroOnline
  }

  if (getCurrentScope()) {
    onScopeDispose(cleanup)
  }

  return {
    useZero,
    useQuery,
    useZeroOnline,
  }
}
