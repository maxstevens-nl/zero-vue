// based on https://github.com/rocicorp/mono/tree/main/packages/zero-solid

import type { HumanReadable, Query, ResultType, Schema } from '@rocicorp/zero'
import type { UseQueryOptions } from '@rocicorp/zero/solid'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'

import { DEFAULT_TTL } from '@rocicorp/zero'
import { computed, getCurrentInstance, isRef, onUnmounted, shallowRef, toValue, watch } from 'vue'
import { vueViewFactory } from './view'

interface QueryResult<TReturn> {
  data: ComputedRef<HumanReadable<TReturn>>
  status: ComputedRef<ResultType>
}

export function useQuery<
  TSchema extends Schema,
  TTable extends keyof TSchema['tables'] & string,
  TReturn,
>(
  _query: MaybeRefOrGetter<Query<TSchema, TTable, TReturn>>,
  options?: MaybeRefOrGetter<UseQueryOptions>,
): QueryResult<TReturn> {
  const query = toValue(_query) as Query<TSchema, TTable, TReturn>
  const ttl = computed(() => toValue(options)?.ttl ?? DEFAULT_TTL)
  const view = shallowRef(query.materialize(vueViewFactory, ttl.value))

  const watchSource = [
    isRef(_query) || typeof _query === 'function' ? _query : () => _query,
    ttl,
  ] as const

  watch(watchSource, ([query, ttl]) => {
    view.value.destroy()
    view.value = (query as Query<TSchema, TTable, TReturn>).materialize(
      vueViewFactory,
      ttl,
    )
  })

  if (getCurrentInstance()) {
    onUnmounted(() => view.value.destroy())
  }

  return {
    data: computed(() => view.value.data),
    status: computed(() => view.value.status),
  }
}
