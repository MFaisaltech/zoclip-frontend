'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { workspaceApi, type ResourceName } from './workspace-api'
import { createWorkspaceResource } from './workspace-resource'

export function useWorkspaceResource<K extends ResourceName>(name: K) {
  const resource = useMemo(
    () => createWorkspaceResource(name, workspaceApi),
    [name],
  )
  const state = useSyncExternalStore(
    resource.subscribe,
    resource.getSnapshot,
    resource.getServerSnapshot,
  )
  useEffect(() => {
    void resource.refresh()
    return () => resource.dispose()
  }, [resource])
  return { ...state, refresh: resource.refresh, loadMore: resource.loadMore }
}
