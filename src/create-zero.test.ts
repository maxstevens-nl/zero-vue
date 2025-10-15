import { createSchema, number, string, table, Zero } from '@rocicorp/zero'
import { assert, describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import { createZero } from './create-zero'

const testSchema = createSchema({
  tables: [
    table('test')
      .columns({
        id: number(),
        name: string(),
      })
      .primaryKey('id'),
  ],
})

describe('createZero', () => {
  it('creates a zero instance', () => {
    const { useZero } = createZero({
      userID: 'test-user',
      server: null,
      schema: testSchema,
      kvStore: 'mem' as const,
    })

    const zero = useZero()
    assert(zero?.value)
    expect(zero?.value.userID).toEqual('test-user')
  })

  it('accepts Zero instance instead of options', () => {
    const zero = new Zero({
      userID: 'test-user',
      server: null,
      schema: testSchema,
      kvStore: 'mem' as const,
    })
    const { useZero } = createZero({ zero })

    const usedZero = useZero()
    assert(usedZero?.value)
    expect(usedZero.value).toEqual(zero)
  })

  it('updates when options change', async () => {
    const userID = ref('test-user')
    const zeroOptions = computed(() => ({
      userID: userID.value,
      server: null,
      schema: testSchema,
      kvStore: 'mem' as const,
    }))

    const { useZero } = createZero(zeroOptions)

    const zero = useZero()
    assert(zero?.value)

    expect(zero.value.userID).toEqual('test-user')

    const oldZero = zero.value

    userID.value = 'test-user-2'
    await 1

    expect(zero.value.userID).toEqual('test-user-2')
    expect(zero.value.closed).toBe(false)
    expect(oldZero.closed).toBe(true)
  })

  it('updates when Zero instance changes', async () => {
    const userID = ref('test-user')

    const zero = computed(() => ({ zero: new Zero({
      userID: userID.value,
      server: null,
      schema: testSchema,
      kvStore: 'mem' as const,
    }) }))

    const { useZero } = createZero(zero)
    const usedZero = useZero()
    assert(usedZero?.value)

    expect(usedZero.value.userID).toEqual('test-user')

    const oldZero = usedZero.value

    userID.value = 'test-user-2'
    await 1

    expect(usedZero.value.userID).toEqual('test-user-2')
    expect(usedZero.value.closed).toBe(false)
    expect(oldZero.closed).toBe(true)
  })
})
