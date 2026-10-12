import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

// Deliberately limited to Milestone 1. Fail on unsupported schema constructs.
const source = new URL('../../backend/docs/openapi.json', import.meta.url)
const target = new URL('../lib/auth-schema.ts', import.meta.url)
const raw = await readFile(source, 'utf8')
const api = JSON.parse(raw)
const selected = [
  ['get', '/api/v1/auth/csrf'], ['get', '/api/v1/me'],
  ...['register', 'verify-email', 'login', 'logout', 'session/rotate', 'password/forgot', 'password/reset']
    .map((path) => ['post', `/api/v1/auth/${path}`]),
]
const required = new Set(['Problem'])
function type(schema) {
  if (schema.$ref) {
    const name = schema.$ref.split('/').at(-1)
    if (!schema.$ref.startsWith('#/components/schemas/')) throw Error('Unsupported reference')
    required.add(name)
    return `AuthSchemas[${JSON.stringify(name)}]`
  }
  if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(' | ')
  if (schema.anyOf) return schema.anyOf.map(type).join(' | ')
  if (schema.type === 'array') return `Array<${type(schema.items)}>`
  if (schema.type === 'object') return `{ ${Object.entries(schema.properties ?? {}).map(([key, value]) =>
    `${JSON.stringify(key)}${schema.required?.includes(key) ? '' : '?'}: ${type(value)}`,
  ).join('; ')} }`
  const primitive = { string: 'string', integer: 'number', number: 'number', boolean: 'boolean', null: 'null' }[schema.type]
  if (!primitive) throw Error(`Unsupported schema: ${JSON.stringify(schema)}`)
  return primitive
}
const operations = selected.map(([method, path]) => {
  const operation = api.paths[path]?.[method]
  if (!operation) throw Error(`Missing implemented operation ${method} ${path}`)
  const request = operation.requestBody?.content['application/json']?.schema
  const responses = Object.entries(operation.responses).filter(([status]) => /^2\d\d$/.test(status))
  if (responses.length !== 1) throw Error(`Ambiguous success response: ${path}`)
  const response = responses[0][1].content['application/json'].schema
  return `  ${JSON.stringify(`${method.toUpperCase()} ${path}`)}: { request: ${request ? type(request) : 'never'}; response: ${type(response)} }`
})
const schemas = []
for (const name of required) schemas.push(`  ${JSON.stringify(name)}: ${type(api.components.schemas[name])}`)
const limits = Object.fromEntries(['Credentials', 'TokenInput'].flatMap((name) =>
  Object.entries(api.components.schemas[name].properties).map(([key, schema]) => [key, {
    ...(schema.minLength !== undefined && { minLength: schema.minLength }),
    ...(schema.maxLength !== undefined && { maxLength: schema.maxLength }),
  }]),
))
const result = `// Generated from backend/docs/openapi.json. Do not edit.\n// Source SHA-256: ${createHash('sha256').update(raw).digest('hex')}\nexport interface AuthSchemas {\n${schemas.join('\n')}\n}\n\nexport interface AuthOperations {\n${operations.join('\n')}\n}\n\nexport const authFieldLimits = ${JSON.stringify(limits, null, 2)} as const\n`
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8') !== result) throw Error('Auth contract drift: run npm run api:generate')
  console.log('Authentication types match backend OpenAPI')
} else {
  await writeFile(target, result)
  console.log('Generated authentication types from backend OpenAPI')
}
