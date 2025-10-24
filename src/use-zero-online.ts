import type { Zero } from '@rocicorp/zero'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { onScopeDispose, ref, toValue, watch } from 'vue'

export function useZeroOnline(zero: MaybeRefOrGetter<Zero<any>>): Readonly<Ref<boolean>> {
  const zeroOnline = ref() as Ref<boolean>
  let onOnlineCleanup: (() => void) | undefined

  function cleanup() {
    if (onOnlineCleanup) {
      onOnlineCleanup()
    }
  }

  watch(() => toValue(zero), (z) => {
    cleanup()

    zeroOnline.value = z.online
    onOnlineCleanup = z.onOnline((online) => {
      zeroOnline.value = online
    })
  }, { immediate: true })

  onScopeDispose(cleanup)

  return zeroOnline
}
