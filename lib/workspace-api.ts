import { AuthApiError, authApi, resolveApiOrigin } from './auth-api'
import {
  workspaceDefinitions,
  workspaceDescriptors,
  type WorkspaceResponses,
} from './workspace-schema'

export type ResourceName = keyof WorkspaceResponses
export type { WorkspaceSchemas, WorkspaceResponses } from './workspace-schema'
export const pageSize = 20
export const sessionInvalidEvent = 'zoclip-session-invalid'
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

type Schema = {
  $ref?: string
  const?: unknown
  enum?: readonly unknown[]
  anyOf?: readonly Schema[]
  type?: string
  format?: string
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  pattern?: string
  minItems?: number
  maxItems?: number
  items?: Schema
  properties?: Readonly<Record<string, Schema>>
  required?: readonly string[]
  additionalProperties?: boolean
}
export function matches(schema: Schema, value: unknown, definitions: Readonly<Record<string, Schema>> = workspaceDefinitions): boolean {
  if (schema.$ref) {
    const name = schema.$ref
      .split('/')
      .at(-1)!
    return (
      Boolean(definitions[name]) &&
      matches(definitions[name], value, definitions)
    )
  }
  if ('const' in schema) return value === schema.const
  if (schema.enum) return schema.enum.includes(value)
  if (schema.anyOf) return schema.anyOf.some((option) => matches(option, value, definitions))
  switch (schema.type) {
    case 'null':
      return value === null
    case 'boolean':
      return typeof value === 'boolean'
    case 'integer':
    case 'number':
      return (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        (schema.type !== 'integer' || Number.isSafeInteger(value)) &&
        (schema.minimum === undefined || value >= schema.minimum) &&
        (schema.maximum === undefined || value <= schema.maximum)
        && (schema.exclusiveMinimum === undefined || value > schema.exclusiveMinimum)
      )
    case 'string':
      return (
        typeof value === 'string' &&
        (schema.minLength === undefined || value.length >= schema.minLength) &&
        (schema.maxLength === undefined || value.length <= schema.maxLength) &&
        (schema.pattern === undefined || new RegExp(schema.pattern).test(value)) &&
        (schema.format !== 'uuid' || uuid.test(value)) &&
        (schema.format !== 'date-time' || Number.isFinite(Date.parse(value)))
      )
    case 'array':
      return (
        Array.isArray(value) &&
        Boolean(schema.items) &&
        (schema.minItems === undefined || value.length >= schema.minItems) &&
        (schema.maxItems === undefined || value.length <= schema.maxItems) &&
        value.every((item) => matches(schema.items!, item, definitions))
      )
    case 'object': {
      if (!value || typeof value !== 'object' || Array.isArray(value))
        return false
      const object = value as Record<string, unknown>
      return (
        (schema.required ?? []).every((key) => Object.hasOwn(object, key)) &&
        Object.entries(schema.properties ?? {}).every(
          ([key, property]) =>
            !Object.hasOwn(object, key) || matches(property, object[key], definitions),
        ) &&
        (schema.additionalProperties !== false ||
          Object.keys(object).every((key) =>
            Object.hasOwn(schema.properties ?? {}, key),
          ))
      )
    }
    default:
      return false
  }
}

export function validWorkspaceResponse<K extends ResourceName>(
  name: K,
  data: unknown,
): data is WorkspaceResponses[K] {
  if (!matches(workspaceDescriptors[name].response, data)) return false
  if (name === 'wallet') {
    const wallet = data as WorkspaceResponses['wallet']
    return wallet.available_credits >= 0 && wallet.reserved_credits >= 0
  }
  if (name === 'transactions')
    return (data as WorkspaceResponses['transactions']).items.every(
      (item) => item.available_after >= 0 && item.reserved_after >= 0,
    )
  if (name === 'plans')
    return (data as WorkspaceResponses['plans']).every(
      (plan) =>
        !plan.price ||
        (plan.price.price_paisa >= 0 &&
          plan.price.included_credits >= 0 &&
          [0, 30].includes(plan.price.valid_days)),
    )
  if (name === 'clips')
    return (data as WorkspaceResponses['clips']).every((clip) => {
      const duration = clip.preferences.end_ms - clip.preferences.start_ms
      return clip.revision > 0 && duration >= 250 && duration <= 90000
    })
  if (name === 'jobs')
    return (data as WorkspaceResponses['jobs']).every(
      (job) =>
        job.attempts >= 0 &&
        (job.progress_percent === null ||
          (job.progress_percent >= 0 && job.progress_percent <= 100)) &&
        (job.estimated_credits === null || job.estimated_credits >= 0),
    )
  return true
}

export function createWorkspaceApi(
  options: {
    origin?: string
    fetch?: typeof fetch
    timeoutMs?: number
    onUnauthorized?: () => void
  } = {},
) {
  const fetcher =
    options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  return {
    async read<K extends ResourceName>(
      name: K,
      cursor?: string,
      signal?: AbortSignal,
    ): Promise<WorkspaceResponses[K]> {
      const descriptor = workspaceDescriptors[name]
      const url = new URL(resolveApiOrigin(options.origin) + descriptor.path)
      if (descriptor.cursor) {
        url.searchParams.set('limit', String(pageSize))
        if (cursor) {
          if (!uuid.test(cursor)) throw new AuthApiError(0, 'invalid_response')
          url.searchParams.set(descriptor.cursor, cursor)
        }
      } else if (cursor) throw new AuthApiError(0, 'invalid_response')
      const controller = new AbortController()
      const abort = () => controller.abort()
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) controller.abort()
      const timer = setTimeout(abort, options.timeoutMs ?? 15000)
      try {
        const response = await fetcher(url.href, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        })
        const data: unknown = await response.json().catch(() => null)
        if (controller.signal.aborted)
          throw new DOMException('Request canceled', 'AbortError')
        if (!response.ok) {
          const code =
            data &&
            typeof data === 'object' &&
            'code' in data &&
            typeof data.code === 'string'
              ? data.code
              : 'http_error'
          if (response.status === 401) options.onUnauthorized?.()
          const retry = Number(response.headers.get('Retry-After'))
          throw new AuthApiError(
            response.status,
            code,
            Number.isFinite(retry) && retry > 0 ? Math.ceil(retry) : null,
          )
        }
        if (!validWorkspaceResponse(name, data))
          throw new AuthApiError(response.status, 'invalid_response')
        return data
      } catch (error) {
        if (signal?.aborted)
          throw new DOMException('Request canceled', 'AbortError')
        if (error instanceof AuthApiError) throw error
        throw new AuthApiError(
          0,
          controller.signal.aborted ? 'timeout' : 'network_error',
        )
      } finally {
        clearTimeout(timer)
        signal?.removeEventListener('abort', abort)
      }
    },
  }
}

export const workspaceApi = createWorkspaceApi({
  onUnauthorized: () => {
    authApi.clearCsrf()
    if (typeof window !== 'undefined')
      window.dispatchEvent(new Event(sessionInvalidEvent))
  },
})
