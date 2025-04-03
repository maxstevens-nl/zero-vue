// based on https://github.com/rocicorp/mono/tree/main/packages/zero-solid

import type { HumanReadable, Query, ResultType, Schema, TTL } from '@rocicorp/zero'
import type { UseQueryOptions } from '@rocicorp/zero/solid'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { VueView } from './view'

import { DEFAULT_TTL } from '@rocicorp/zero'
import { computed, getCurrentInstance, onUnmounted, shallowRef, toValue, watchEffect } from 'vue'
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
  query: MaybeRefOrGetter<Query<TSchema, TTable, TReturn>>,
  options?: MaybeRefOrGetter<UseQueryOptions>,
): QueryResult<TReturn> {
  const ttl = computed(() => toValue(options)?.ttl ?? DEFAULT_TTL)
  const view = shallowRef<VueView<HumanReadable<TReturn>>>(
    createMaterializedView(toValue(query), toValue(ttl)),
  )

  watchEffect(() => {
    view.value.destroy()
    view.value = createMaterializedView(toValue(query), toValue(ttl))
  })

  if (getCurrentInstance()) {
    onUnmounted(() => view.value.destroy())
  }

  return {
    data: computed(() => view.value.data),
    status: computed(() => view.value.status),
  }

  function createMaterializedView(
    query: Query<TSchema, TTable, TReturn>,
    ttl: TTL,
  ) {
    return query.materialize(vueViewFactory, ttl)
  }
}
