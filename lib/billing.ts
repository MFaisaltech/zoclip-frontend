import { AuthApiError, authErrorMessage } from './auth-api';
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
