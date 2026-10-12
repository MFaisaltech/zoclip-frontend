import {
  pageSize,
  type ResourceName,
  type WorkspaceResponses,
} from './workspace-api'

type Reader = {
  read<K extends ResourceName>(
    name: K,
    cursor?: string,
    signal?: AbortSignal,
  ): Promise<WorkspaceResponses[K]>
}
export type ResourceState<K extends ResourceName> = {
  status: 'loading' | 'ready' | 'error'
  data: WorkspaceResponses[K] | null
  error: unknown
  moreError: unknown
  loadingMore: boolean
  cursor: string | null
}

function nextCursor<K extends ResourceName>(
  name: K,
  data: WorkspaceResponses[K],
): string | null {
  if (name === 'transactions')
    return (data as WorkspaceResponses['transactions']).next_cursor
  if (!Array.isArray(data) || name === 'plans' || data.length < pageSize)
    return null
  return data.at(-1)?.id ?? null
}
function merge<K extends ResourceName>(
  previous: WorkspaceResponses[K],
  next: WorkspaceResponses[K],
): WorkspaceResponses[K] {
  const a: { id: string }[] = Array.isArray(previous)
    ? previous
    : 'items' in previous
      ? previous.items
      : []
  const b: { id: string }[] = Array.isArray(next)
    ? next
    : 'items' in next
      ? next.items
      : []
  const seen = new Set(a.map((item) => item.id))
  const items = [...a, ...b.filter((item) => !seen.has(item.id))]
  return (
    Array.isArray(next) ? items : { ...next, items }
  ) as WorkspaceResponses[K]
}

// One instance per mounted account. Refresh and disposal invalidate older responses
// even if a fetch implementation completes after its AbortSignal was canceled.
export function createWorkspaceResource<K extends ResourceName>(
  name: K,
  api: Reader,
) {
  const initial: ResourceState<K> = {
    status: 'loading',
    data: null,
    error: null,
    moreError: null,
    loadingMore: false,
    cursor: null,
  }
  let state = initial
  let generation = 0
  let controller: AbortController | null = null
  const listeners = new Set<() => void>()
  const set = (value: ResourceState<K>) => {
    state = value
    listeners.forEach((listener) => listener())
  }
  async function load(more = false) {
    if (
      more &&
      (state.status !== 'ready' || state.loadingMore || !state.cursor)
    )
      return
    const previous = state
    const cursor = more ? previous.cursor! : undefined
    const current = ++generation
    controller?.abort()
    controller = new AbortController()
    set(more ? { ...previous, loadingMore: true, moreError: null } : initial)
    try {
      const data = await api.read(name, cursor, controller.signal)
      if (current !== generation) return
      const next = nextCursor(name, data)
      if (more && next === cursor) throw Error('Pagination did not advance')
      set({
        status: 'ready',
        data: more && previous.data ? merge(previous.data, data) : data,
        error: null,
        moreError: null,
        loadingMore: false,
        cursor: next,
      })
    } catch (error) {
      if (current !== generation) return
      set(
        more
          ? { ...previous, loadingMore: false, moreError: error }
          : { ...initial, status: 'error', error },
      )
    }
  }
  return {
    getSnapshot: () => state,
    getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    refresh: () => load(),
    loadMore: () => load(true),
    dispose: () => {
      ++generation
      controller?.abort()
      state = initial
    },
  }
}
