import { AuthApiError, authErrorMessage } from './auth-api';
import type { MediaSchemas } from './media-schema';

export function consumptionRules(fields: Record<string,string>, original?: MediaSchemas['ConsumptionRules']): MediaSchemas['ConsumptionRules'] {
    return {
        purchasable: original?.purchasable ?? true,
        lifetime_output_limit: original?.lifetime_output_limit ?? null,
        minimum_job_credits: Number(fields.minimum_job_credits),
        credits_per_minute: Number(fields.credits_per_minute),
        credits_per_output: Number(fields.credits_per_output),
        credits_per_edit: Number(fields.credits_per_edit),
        captions_credits: Number(fields.captions_credits), reframe_credits: Number(fields.reframe_credits),
        max_source_seconds: Number(fields.max_source_seconds), max_outputs: Number(fields.max_outputs),
        max_edits: Number(fields.max_edits), max_concurrent_jobs: Number(fields.max_concurrent_jobs),
        daily_credits: Number(fields.daily_credits), monthly_credits: Number(fields.monthly_credits),
    };
}
export function formatPaisa(value: number): string {
    if (!Number.isSafeInteger(value) || value < 0)
        throw new Error('Invalid PKR amount');
    const amount = BigInt(value);
    return `PKR ${(amount / BigInt(100)).toLocaleString()}.${String(amount % BigInt(100)).padStart(2, '0')}`;
}
export function financeError(error: unknown): string {
    if (error instanceof AuthApiError) {
        const messages: Record<string, string> = {
            insufficient_credits: 'This adjustment would exceed the available balance. Reserved credits cannot be deducted.',
            idempotency_conflict: 'This request key is already bound to different details. Check the original result.',
            plan_unconfigured: 'Plan terms have not been configured yet.',
            payments_disabled: 'Merchant checkout is not available. No purchase was created.',
            validation_failed: 'Check every amount, limit and reason before submitting.',
            invalid_request: 'Check the integer amounts, required limits and reason before submitting.',
            forbidden: 'Administrator permission is required. No changes were made.',
        };
        if (messages[error.code])
            return messages[error.code];
    }
    return authErrorMessage(error);
}
export const ruleLabels: Record<string, string> = {
    minimum_job_credits: 'Minimum credits / video',
    credits_per_minute: 'Credits / started source minute', credits_per_output: 'Credits / output',
    credits_per_edit: 'Credits / edit', captions_credits: 'Caption credits', reframe_credits: 'Reframe credits',
    max_source_seconds: 'Maximum source seconds', max_outputs: 'Outputs / job', max_edits: 'Edits / job',
    max_concurrent_jobs: 'Concurrent jobs', daily_credits: 'Daily credit limit', monthly_credits: 'Monthly credit limit',
};
