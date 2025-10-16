import { createSecretKey } from 'node:crypto'
import { SignJWT } from 'jose'

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()

  const secret = createSecretKey(runtimeConfig.authKey, 'utf-8')
  const alg = 'HS256'

  const jwt = await new SignJWT()
    .setProtectedHeader({ alg })
    .setSubject('6z7dkeVLNm')
    .sign(secret)

  setCookie(event, 'jwt', jwt)
})
