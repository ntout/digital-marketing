import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager'

const TTL_MS = 5 * 60 * 1000

type CachedSecret = {
  expiresAt: number
  value: string
}

const cache = new Map<string, CachedSecret>()

let client: SecretsManagerClient | undefined

function getClient() {
  client ??= new SecretsManagerClient({
    region: process.env.AWS_REGION ?? 'us-east-1',
  })

  return client
}

export function setSecretsClient(nextClient: SecretsManagerClient) {
  client = nextClient
}

export function clearSecretCache() {
  cache.clear()
}

export async function getSecret(name: string): Promise<string> {
  const now = Date.now()
  const cached = cache.get(name)

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const response = await getClient().send(new GetSecretValueCommand({ SecretId: name }))
  const value =
    response.SecretString ??
    (response.SecretBinary ? Buffer.from(response.SecretBinary).toString('utf8') : undefined)

  if (!value) {
    throw new Error(`Secret "${name}" did not contain a string value`)
  }

  cache.set(name, {
    value,
    expiresAt: now + TTL_MS,
  })

  return value
}
