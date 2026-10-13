import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const raw = await readFile(
  new URL('../../backend/docs/openapi.json', import.meta.url),
  'utf8',
)
const api = JSON.parse(raw)
const selected = {
  initiate: ['post', '/api/v1/uploads'],
  upload: ['get', '/api/v1/uploads/{upload_id}'],
  part: ['put', '/api/v1/uploads/{upload_id}/parts/{part_number}'],
  complete: ['post', '/api/v1/uploads/{upload_id}/complete'],
  deleteUpload: ['delete', '/api/v1/uploads/{upload_id}'],
  importUrl: ['post', '/api/v1/videos/import-url'],
  quote: ['post', '/api/v1/jobs/quote'],
  generate: ['post', '/api/v1/videos/{video_id}/generate'],
  video: ['get', '/api/v1/videos/{video_id}'],
  job: ['get', '/api/v1/jobs/{job_id}'],
  events: ['get', '/api/v1/jobs/{job_id}/events'],
  cancel: ['post', '/api/v1/jobs/{job_id}/cancel'],
}
const required = new Set()
function type(schema) {
  if (schema.$ref) {
    const name = schema.$ref.split('/').at(-1)
    if (!schema.$ref.startsWith('#/components/schemas/'))
      throw Error('Unsupported reference')
    required.add(name)
    return `MediaSchemas[${JSON.stringify(name)}]`
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
const operations = Object.entries(selected).map(([name, [method, path]]) => {
  const operation = api.paths[path]?.[method]
  if (!operation) throw Error(`Missing implemented ${method} ${path}`)
  const success = Object.keys(operation.responses).find(code => code.startsWith('2'))
  const response = operation.responses[success]?.content?.['application/json']?.schema ?? {type: 'null'}
  const request = operation.requestBody?.content?.['application/json']?.schema ?? {type: 'null'}
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
  descriptors[name] = { path, method: method.toUpperCase(), response, request,
    idempotent: parameters.some(p => p.name.toLowerCase() === 'idempotency-key'),
    binary: Boolean(operation.requestBody?.content?.['application/octet-stream']) }
  return `  ${name}: { request: ${type(request)}; response: ${type(response)} }`
})
const definitions = {}
const schemas = []
for (const name of required) {
  definitions[name] = api.components.schemas[name]
  schemas.push(`  ${JSON.stringify(name)}: ${type(definitions[name])}`)
}
const result = `// Generated from backend/docs/openapi.json. Do not edit.\n// Source SHA-256: ${createHash('sha256').update(raw).digest('hex')}\nexport interface MediaSchemas {\n${schemas.join('\n')}\n}\nexport interface MediaOperations {\n${operations.join('\n')}\n}\nexport const mediaDescriptors = ${JSON.stringify(descriptors, null, 2)} as const\nexport const mediaDefinitions = ${JSON.stringify(definitions, null, 2)} as const\n`
const target = new URL('../lib/media-schema.ts', import.meta.url)
if (process.argv.includes('--check')) {
  if ((await readFile(target, 'utf8')) !== result)
    throw Error('Media contract drift: run npm run api:generate')
  console.log(
    'Media operations, request/response schemas and headers match backend OpenAPI',
  )
} else {
  await writeFile(target, result)
  console.log('Generated media contract from backend OpenAPI')
}
