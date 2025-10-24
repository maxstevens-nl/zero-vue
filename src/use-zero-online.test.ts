import type { Schema } from '@rocicorp/zero'
import type { Ref } from 'vue'
import { createSchema, number, string, table, Zero } from '@rocicorp/zero'
import { assert, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useZeroOnline } from './use-zero-online'

describe('useZeroOnline', () => {
  it('takes a Zero instance', () => {
    const zero = new Zero({
      userID: 'test-user',
      server: null,
      schema: createSchema({
        tables: [
          table('test')
            .columns({
              id: number(),
              name: string(),
            })
            .primaryKey('id'),
        ],
      }),
      kvStore: 'mem' as const,
    })

    const isOnline = useZeroOnline(zero)
    expect(isOnline.value).toBe(false)
  })

  it('sets isOnline to true when the Zero instance is online', async () => {
    let onOnlineFn: ((online: boolean) => void) | undefined
    let cleanupCalled = false

    function getMockZero(): Zero<Schema> {
      return {
        online: false,
        onOnline: (fn: ((online: boolean) => void)) => {
          onOnlineFn = fn

          return () => {
            cleanupCalled = true
          }
        },
        close: vi.fn(),
      } as unknown as Zero<Schema>
    }

    const zero = ref(getMockZero()) as Ref<Zero<Schema>>

    const isOnline = useZeroOnline(zero)
    expect(isOnline.value).toBe(false)
    assert(onOnlineFn)

    onOnlineFn(true)
    expect(isOnline.value).toBe(true)
    expect(cleanupCalled).toBe(false)

    zero.value = getMockZero()
    await nextTick()
    expect(cleanupCalled).toBe(true)
    expect(isOnline.value).toBe(false)
  })
})
