'use client';
import { useCallback, useEffect, useState } from 'react';
import { mediaApi, type MediaOperation } from './media-api';
import type { MediaOperations } from './media-schema';
// Uses the existing cookie/CSRF/contract-validated transport. No account data is cached.
export function useFinance<K extends MediaOperation>(name: K, query: Record<string, string | number> = {}, params: Record<string, string> = {}) {
    const [revision, setRevision] = useState(0);
    const [state, setState] = useState<{
        loading: boolean;
        data: MediaOperations[K]['response'] | null;
        error: unknown;
    }>({ loading: true, data: null, error: null });
    const scope = JSON.stringify({ query, params });
    useEffect(() => {
        const controller = new AbortController();
        let current = true;
        const { query, params } = JSON.parse(scope);
        setState({ loading: true, data: null, error: null });
        void mediaApi.call(name, { query, params, signal: controller.signal }).then(data => { if (current)
            setState({ loading: false, data, error: null }); }, error => { if (current)
            setState({ loading: false, data: null, error }); });
        return () => { current = false; controller.abort(); };
    }, [name, scope, revision]);
    const refresh = useCallback(() => setRevision(value => value + 1), []);
    return { ...state, refresh };
}
export function useFinancePage<K extends MediaOperation>(name: K, query: Record<string, string | number> = {}) {
    const [cursors, setCursors] = useState<string[]>([]);
    const resource = useFinance(name, { ...query, limit: 20, ...(cursors.length && { cursor: cursors.at(-1)! }) });
    return { ...resource, first: () => setCursors([]), hasPrevious: cursors.length > 0,
        previous: () => setCursors(values => values.slice(0, -1)),
        next: (cursor: string) => setCursors(values => [...values, cursor]) };
}
