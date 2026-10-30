import { AuthApiError } from './auth-api';
import { mediaApi } from './media-api';
import { matches } from './workspace-api';
import { mediaDefinitions, mediaDescriptors, type MediaSchemas } from './media-schema';
type Change = {
    operation: 'manualActivate';
    resourceId: string;
    body: MediaSchemas['ManualPaymentInput'];
} | {
    operation: 'manualRefund';
    resourceId: string;
    body: MediaSchemas['ManualRefundInput'];
} | {
    operation: 'adjustCredits';
    resourceId: string;
    body: MediaSchemas['AdjustmentInput'];
} | {
    operation: 'configurePlan';
    resourceId: string;
    body: MediaSchemas['PlanVersionInput'];
} | {
    operation: 'grantAccess';
    resourceId: string;
    body: MediaSchemas['EntitlementInput'];
};
export type FinancialIntent = Change & {
    key: string;
    uncertain: boolean;
};
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const storageKey = (admin: string) => `zoclip-financial-intent:${admin}`;
export function readFinancialIntent(admin: string, storage: Storage): FinancialIntent | null {
    const raw = storage.getItem(storageKey(admin));
    if (!raw)
        return null;
    const value = JSON.parse(raw);
    if (typeof value.uncertain !== 'boolean' || !['adjustCredits', 'configurePlan', 'grantAccess', 'manualActivate', 'manualRefund'].includes(value.operation) ||
        !uuid.test(value.resourceId) || !uuid.test(value.key) ||
        !matches(mediaDescriptors[value.operation as FinancialIntent['operation']].request, value.body, mediaDefinitions))
        throw new AuthApiError(0, 'invalid_request');
    return value;
}
export function persistFinancialIntent(admin: string, change: Change, storage: Storage): FinancialIntent {
    if (readFinancialIntent(admin, storage))
        throw new Error('Resolve the pending financial request first');
    if (!uuid.test(change.resourceId) || !matches(mediaDescriptors[change.operation].request, change.body, mediaDefinitions))
        throw new AuthApiError(0, 'invalid_request');
    const intent = { ...structuredClone(change), key: crypto.randomUUID(), uncertain: false };
    storage.setItem(storageKey(admin), JSON.stringify(intent));
    return intent;
}
export async function sendFinancialIntent(admin: string, intent: FinancialIntent, storage: Storage, api = mediaApi, signal?: AbortSignal) {
    const saved = readFinancialIntent(admin, storage);
    const identity = (value: FinancialIntent | null) => value && ({operation:value.operation,resourceId:value.resourceId,body:value.body,key:value.key});
    if (JSON.stringify(identity(saved)) !== JSON.stringify(identity(intent)))
        throw new Error('Financial intent changed');
    // A crash or lost acknowledgement must keep the same key, even after a later rejection.
    const previouslyUncertain = saved!.uncertain;
    storage.setItem(storageKey(admin), JSON.stringify({...saved, uncertain: true}));
    const params: Record<string, string> = intent.operation === 'configurePlan' ? { plan_id: intent.resourceId } : intent.operation === 'manualRefund' ? {order_id:intent.resourceId} : { user_id: intent.resourceId };
    // Success must pass the existing response schema before the pending key can be removed.
    try {
        const result = await api.call(intent.operation, { params, body: intent.body, key: intent.key, signal });
        storage.removeItem(storageKey(admin));
        return result;
    }
    catch (error) {
        // These responses reject before a financial write. Unknown/network/5xx results stay locked.
        if (!previouslyUncertain && error instanceof AuthApiError && ([401, 403, 422].includes(error.status) ||
            ['insufficient_credits', 'not_found', 'allowance_already_granted'].includes(error.code)))
            storage.removeItem(storageKey(admin));
        throw error;
    }
}
