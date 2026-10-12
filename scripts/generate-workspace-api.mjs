import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const raw = await readFile(
  new URL('../../backend/docs/openapi.json', import.meta.url),
  'utf8',
)
const api = JSON.parse(raw)
const selected = {
  videos: '/api/v1/videos',
  jobs: '/api/v1/jobs',
  clips: '/api/v1/clips',
  wallet: '/api/v1/me/credits',
  transactions: '/api/v1/me/credit-transactions',
  entitlements: '/api/v1/me/entitlements',
  plans: '/api/v1/plans',
}
const required = new Set()
function type(schema) {
  if (schema.$ref) {
    const name = schema.$ref.split('/').at(-1)
    if (!schema.$ref.startsWith('#/components/schemas/'))
      throw Error('Unsupported reference')
    required.add(name)
    return `WorkspaceSchemas[${JSON.stringify(name)}]`
  }
  if ('const' in schema) return JSON.stringify(schema.const)
  if (schema.enum)
    return schema.enum.map((value) => JSON.stringify(value)).join(' | ')
  if (schema.anyOf) return schema.anyOf.map(type).join(' | ')
  if (schema.type === 'array') return `Array<${type(schema.items)}>`
  if (schema.type === 'object') {
    if (!schema.properties) return 'Record<string, unknown>'
    return `{ ${Object.entries(schema.properties)
      .map(
        ([key, value]) =>
          `${JSON.stringify(key)}${schema.required?.includes(key) ? '' : '?'}: ${type(value)}`,
      )
      .join('; ')} }`
  }
  const result = {
    string: 'string',
    integer: 'number',
    number: 'number',
    boolean: 'boolean',
    null: 'null',
  }[schema.type]
  if (!result) throw Error(`Unsupported schema ${JSON.stringify(schema)}`)
  return result
}
const descriptors = {}
const operations = Object.entries(selected).map(([name, path]) => {
  const operation = api.paths[path]?.get
  const response =
    operation?.responses['200']?.content['application/json']?.schema
  if (!response) throw Error(`Missing implemented GET ${path}`)
  const parameters = operation.parameters ?? []
  const cursor =
    parameters.find((parameter) =>
      ['before', 'cursor'].includes(parameter.name),
    )?.name ?? null
  if (
    cursor &&
    !parameters.some(
      (parameter) =>
        parameter.name === 'limit' && parameter.schema.maximum === 100,
    )
  )
    throw Error('Unexpected pagination contract')
  descriptors[name] = { path, cursor, response }
  return `  ${name}: ${type(response)}`
})
const definitions = {}
const schemas = []
for (const name of required) {
  definitions[name] = api.components.schemas[name]
  schemas.push(`  ${JSON.stringify(name)}: ${type(definitions[name])}`)
}
const result = `// Generated from backend/docs/openapi.json. Do not edit.\n// Source SHA-256: ${createHash('sha256').update(raw).digest('hex')}\nexport interface WorkspaceSchemas {\n${schemas.join('\n')}\n}\nexport interface WorkspaceResponses {\n${operations.join('\n')}\n}\nexport const workspaceDescriptors = ${JSON.stringify(descriptors, null, 2)} as const\nexport const workspaceDefinitions = ${JSON.stringify(definitions, null, 2)} as const\n`
const target = new URL('../lib/workspace-schema.ts', import.meta.url)
if (process.argv.includes('--check')) {
  if ((await readFile(target, 'utf8')) !== result)
    throw Error('Workspace contract drift: run npm run api:generate')
  console.log(
    'Workspace types, response validators and cursors match backend OpenAPI',
  )
} else {
  await writeFile(target, result)
  console.log('Generated workspace contract from backend OpenAPI')
}
