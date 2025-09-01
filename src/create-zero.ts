import type { Schema, ZeroOptions } from '@rocicorp/zero'
import type { App, InjectionKey, MaybeRefOrGetter, ShallowRef } from 'vue'
import { Zero } from '@rocicorp/zero'
import { shallowRef, toValue, watch } from 'vue'

export const zeroSymbol = Symbol('zero') as InjectionKey<ShallowRef<Zero<Schema, undefined>>>

export function createZero<S extends Schema = Schema>(opts: MaybeRefOrGetter<ZeroOptions<S>>) {
  const z = shallowRef() as ShallowRef<Zero<S>>

  watch(() => toValue(opts), async (opts) => {
    // await z.value?.close()
    z.value = new Zero(opts)
  }, { deep: true })

  return {
    install: (app: App) => {
      z.value = new Zero(toValue(opts))

      // @ts-expect-error - TODO: type properly
      app.provide(zeroSymbol, z)
    },
  }
}
