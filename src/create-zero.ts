import type { CustomMutatorDefs, Schema, ZeroOptions } from '@rocicorp/zero'
import type { App, InjectionKey, MaybeRefOrGetter, ShallowRef } from 'vue'
import { Zero } from '@rocicorp/zero'
import { shallowRef, toValue, watch } from 'vue'

export const zeroSymbol = Symbol('zero') as InjectionKey<ShallowRef<Zero<Schema, undefined>>>

const oldZeroCleanups = new Set()

export function createZero<S extends Schema = Schema, MD extends CustomMutatorDefs | undefined = undefined>(optsOrZero: MaybeRefOrGetter<ZeroOptions<S, MD> | { zero: Zero<S, MD> }>) {
  const z = shallowRef() as ShallowRef<Zero<S, MD>>

  const opts = toValue(optsOrZero)
  z.value = 'zero' in opts ? opts.zero : new Zero(opts)

  watch(() => toValue(optsOrZero), (opts) => {
    const cleanupZeroPromise = z.value.close()
    oldZeroCleanups.add(cleanupZeroPromise)
    cleanupZeroPromise.finally(() => {
      oldZeroCleanups.delete(cleanupZeroPromise)
    })

    z.value = 'zero' in opts ? opts.zero : new Zero(opts)
  }, { deep: true })

  return {
    install: (app: App) => {
      // @ts-expect-error - TODO: type properly
      app.provide(zeroSymbol, z)
    },
  }
}
