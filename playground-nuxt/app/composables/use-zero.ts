import { schema } from '#shared/db/schema'
import { decodeJwt } from 'jose'

import { createZero } from 'zero-vue'

export const { useZero, useQuery } = createZero(() => {
  const encodedJWT = useCookie('jwt')
  const decodedJWT = encodedJWT.value && decodeJwt(encodedJWT.value)
  const userID = decodedJWT?.sub ? (decodedJWT.sub as string) : 'anon'

  return {
    userID,
    auth: () => encodedJWT.value || undefined,
    server: import.meta.env.VITE_PUBLIC_SERVER,
    schema,
    // This is often easier to develop with if you're frequently changing
    // the schema. Switch to 'idb' for local-persistence.
    kvStore: 'mem',
  }
})
