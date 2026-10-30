'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, LockKeyhole, Search, ShieldCheck, X } from 'lucide-react';
import ManualPurchases from './manual-purchases';
import type { User } from '@/lib/auth-api';
import type { MediaSchemas } from '@/lib/media-api';
import { useFinance, useFinancePage } from '@/lib/use-finance';
import { useWorkspaceResource } from '@/lib/use-workspace';
import { consumptionRules, financeError, formatPaisa, ruleLabels } from '@/lib/billing';
import { persistFinancialIntent, readFinancialIntent, sendFinancialIntent, type FinancialIntent } from '@/lib/finance-actions';
import { FinanceHeading, FinancePanel, FinanceEmpty, FinanceStat, FinanceBadge, FinancePager, financeAction, financeInput, financeDate } from './finance-ui';
type Plan = MediaSchemas['PlanView'];
type Customer = MediaSchemas['CustomerView'];
type Action = {
    kind: 'credit' | 'access';
    customer: Customer;
} | {
    kind: 'plan';
    plan: Plan;
};
const short = (id: string) => id.slice(0, 8);
function Overview() {
    const overview = useFinance('adminOverview'), usage = useFinance('usageCosts'), limits = useFinance('limits');
    const data = overview.data;
    return <div className="space-y-6">
    <FinancePanel title="Financial overview" resource={overview}>{data && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceStat label="Customers" value={data.customers.toLocaleString()} hint={`${data.verified_customers} verified`}/>
        <FinanceStat label="Available credits" value={data.available_credits.toLocaleString()} hint="Across all wallets"/>
        <FinanceStat label="Reserved credits" value={data.reserved_credits.toLocaleString()} hint="Held against active work"/>
        <FinanceStat label="Active prepaid access" value={data.active_prepaid_access.toLocaleString()} hint="Current 30-day entitlements"/>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
        <FinanceBadge>{data.spending_blocked ? 'Spending blocked' : 'Spending permitted by existing policy'}</FinanceBadge>
        <span className="text-[#8a857f]">Merchant checkout unavailable</span>
        </div>
        </>}</FinancePanel>
    <FinancePanel title="Recorded costs & exposure" resource={usage}>{usage.data && <>
        <div className="grid gap-3 sm:grid-cols-3">
        <FinanceStat label="Recorded cost · USD" value={usage.data.actual_usd} hint="All-time provider and allocation records"/>
        <FinanceStat label="Held / uncertain · USD" value={usage.data.held_or_unknown_usd} hint="Included in the budget controls"/>
        <FinanceStat label="Expense attempts" value={usage.data.attempts.toLocaleString()} hint={`Estimated exposure total: USD ${usage.data.estimated_usd}`}/>
        </div>
        <p className="mt-4 text-xs leading-5 text-[#8a857f]">USD values are exact accounting amounts. Compute and storage allocations are estimates, not provider invoices. No exchange rate or profit is inferred.</p>
        </>}</FinancePanel>
    <FinancePanel title="Budget policy" resource={limits}>{limits.data ? <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">{(['per_job_usd', 'user_daily_usd', 'user_monthly_usd', 'global_daily_usd', 'global_monthly_usd'] as const).map(key => <div className="flex justify-between gap-4 text-sm" key={key}>
            <dt className="capitalize text-[#77736e]">{key.replaceAll('_', ' ')}</dt>
            <dd className="font-medium">USD {limits.data!.limits[key]}</dd>
            </div>)}<div className="text-xs text-[#8a857f] sm:col-span-2">Read-only policy view. This dashboard has no AI enablement or spending-policy controls.</div>
        </dl> : <FinanceEmpty>No financial policy configured. Paid processing is unavailable.</FinanceEmpty>}</FinancePanel>
    <FinancePanel title="Job status distribution" resource={overview}>{data && Object.keys(data.job_states).length ? <div className="flex flex-wrap gap-3">{Object.entries(data!.job_states).map(([state, count]) => <div key={state} className="rounded-xl border border-[#eeeae5] px-4 py-3">
            <p className="text-xs text-[#8a857f]">{state.replaceAll('_', ' ')}</p>
            <p className="mt-1 text-xl font-semibold">{count}</p>
            </div>)}</div> : <FinanceEmpty>No jobs recorded.</FinanceEmpty>}</FinancePanel>
    </div>;
}
function CustomerUsage({ customer }: {
    customer: Customer;
}) {
    const resource = useFinance('customerBilling', {}, { user_id: customer.id });
    return <FinancePanel title={`Usage · ${customer.email}`} resource={resource}>{resource.data && <div className="grid gap-3 sm:grid-cols-3">
        <FinanceStat label="Applied plan" value={<span className="capitalize">{resource.data.plan?.slug ?? 'Unconfigured'}</span>} hint={resource.data.access_source.replaceAll('_', ' ')}/>
        <FinanceStat label="Daily / monthly usage + holds" value={`${resource.data.daily_used_credits} / ${resource.data.monthly_used_credits}`} hint="UTC calendar periods"/>
        <FinanceStat label="Held credits" value={resource.data.held_credits} hint={`${resource.data.held_reservations} reservations`}/>
        </div>}</FinancePanel>;
}
function Customers({ onAction }: {
    onAction: (value: Action) => void;
}) {
    const [query, setQuery] = useState(''), [search, setSearch] = useState('');
    return <div className="space-y-5">
    <form onSubmit={event => { event.preventDefault(); setSearch(query.trim()); }} className="flex gap-2">
    <label className="flex-1" htmlFor="customer-search">
    <span className="sr-only">Search customer email</span>
    <input id="customer-search" className={financeInput} maxLength={100} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search customer email"/>
    </label>
    <button className={financeAction}>
    <Search size={15}/> Search</button>
    </form>
    <CustomerTable key={search} search={search} onAction={onAction}/>
    </div>;
}
function CustomerTable({ search, onAction }: {
    search: string;
    onAction: (value: Action) => void;
}) {
    const resource = useFinancePage('customers', { search }), [selected, setSelected] = useState<Customer | null>(null);
    return <div className="space-y-5">
    <FinancePanel title="Customers" resource={resource}>{!resource.data?.items.length ? <FinanceEmpty>No customers match this search.</FinanceEmpty> : <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="text-xs text-[#8a857f]">
        <tr>{['Customer', 'Plan', 'Available / reserved', 'Access ends', 'Status', 'Manage'].map(x => <th scope="col" className="pb-3 font-medium" key={x}>{x}</th>)}</tr>
        </thead>
        <tbody>{resource.data.items.map(customer => <tr className="border-t border-[#eeeae5]" key={customer.id}>
            <td className="py-4 pr-4">
            <p className="font-medium">{customer.name ?? customer.email}</p>
            <p className="mt-1 text-xs text-[#8a857f]">{customer.name ? `${customer.email} · ` : ''}Joined {financeDate(customer.created_at)} · {customer.verified ? 'Verified' : 'Unverified'}</p>
            </td>
            <td className="pr-4 capitalize">{customer.plan_slug ?? '—'}</td>
            <td className="tabular-nums">{customer.available_credits} / {customer.reserved_credits}</td>
            <td className="pr-4">{customer.access_ends_at ? financeDate(customer.access_ends_at) : '—'}</td>
            <td>
            <FinanceBadge>{customer.status}</FinanceBadge>{customer.role === 'admin' && <span className="ml-2"><FinanceBadge>Admin</FinanceBadge></span>}
            </td>
            <td className="py-3">
            <div className="flex flex-wrap gap-2">
            <button className={financeAction} onClick={() => setSelected(customer)}>Usage</button>
            <button className={financeAction} disabled={!customer.verified || customer.status !== 'active'} onClick={() => onAction({ kind: 'credit', customer })}>Credits</button>
            <button className={financeAction} disabled={!customer.verified || customer.status !== 'active'} onClick={() => onAction({ kind: 'access', customer })}>Access</button>
            </div>
            </td>
            </tr>)}</tbody>
        </table>
        </div>}<FinancePager page={resource} cursor={resource.data?.next_cursor}/>
    </FinancePanel>{selected && <CustomerUsage key={selected.id} customer={selected}/>}</div>;
}
function Plans({ onAction }: {
    onAction: (value: Action) => void;
}) {
    const resource = useWorkspaceResource('plans');
    return <FinancePanel title="Plan catalog" resource={{ loading: resource.status === 'loading', error: resource.error, refresh: () => { void resource.refresh(); } }}>{!resource.data?.length ? <FinanceEmpty>No catalog entries.</FinanceEmpty> : <div className="grid gap-4 lg:grid-cols-2">{resource.data.map(plan => <article key={plan.id} className="rounded-xl border border-[#e8e4de] p-5">
            <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold capitalize">{plan.slug}</h3>
            <FinanceBadge>{plan.price?.approved ? 'Approved' : 'Unapproved / unconfigured'}</FinanceBadge>
            </div>
            <p className="mt-3 text-sm text-[#77736e]">{plan.price ? `${formatPaisa(plan.price.price_paisa)} · ${plan.price.included_credits} credits · ${plan.price.valid_days ? `${plan.price.valid_days} days prepaid` : 'No timed access'}` : 'No price or allocation configured'}</p>
            <button className={`${financeAction} mt-5`} onClick={() => onAction({ kind: 'plan', plan })}>Create reviewed version <ArrowUpRight size={14}/>
            </button>
            </article>)}</div>}</FinancePanel>;
}
function Jobs() {
    const resource = useFinancePage('staffJobs');
    return <FinancePanel title="All jobs" resource={resource}>{!resource.data?.items.length ? <FinanceEmpty>No jobs recorded.</FinanceEmpty> : <div className="space-y-3">{resource.data.items.map(({ user_id, job }) => <article key={job.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#eeeae5] p-4">
            <div>
            <p className="font-medium">{job.kind} · <span className="font-mono text-xs" title={job.id}>{short(job.id)}</span>
            </p>
            <p className="mt-1 text-xs text-[#8a857f]" title={user_id}>Customer {short(user_id)} · {financeDate(job.updated_at)} · {job.estimated_credits ?? '—'} reserved credits</p>{job.error_code && <p className="mt-2 text-xs text-red-800">{job.error_code}</p>}</div>
            <FinanceBadge>{job.stage}</FinanceBadge>
            </article>)}</div>}<FinancePager page={resource} cursor={resource.data?.next_cursor}/>
    </FinancePanel>;
}
function Audits() {
    const resource = useFinancePage('audits');
    return <FinancePanel title="Immutable audit trail" resource={resource}>{!resource.data?.items.length ? <FinanceEmpty>No audit events available.</FinanceEmpty> : <div className="space-y-3">{resource.data.items.map(row => <article key={row.id} className="rounded-xl border border-[#eeeae5] p-4">
            <p className="text-sm font-medium">{row.action.replaceAll('.', ' / ').replaceAll('_', ' ')}</p>
            <p className="mt-1 break-all text-xs leading-5 text-[#8a857f]">{financeDate(row.created_at)} · Actor {row.actor_id ?? 'Local operator'} · Target {row.target_id ?? '—'}</p>
            <p className="mt-1 break-all font-mono text-[10px] text-[#8a857f]">Request {row.request_id}</p>
            </article>)}</div>}<FinancePager page={resource} cursor={resource.data?.next_cursor}/>
    </FinancePanel>;
}
const manualStorage = {getItem:(key:string)=>sessionStorage.getItem(`manual:${key}`),setItem:(key:string,value:string)=>sessionStorage.setItem(`manual:${key}`,value),removeItem:(key:string)=>sessionStorage.removeItem(`manual:${key}`)};
type PaymentRow = MediaSchemas['StaffOrderView'];
function PaymentDetails({ row, adminId, onChanged }: {
    row: PaymentRow;
    adminId: string;
    onChanged: () => void;
}) {
    const [reference, setReference] = useState(''), [notes, setNotes] = useState(''), [verified, setVerified] = useState(false);
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(false);
    const { order, refund } = row;
    const refundable = order.provider === 'manual' && order.state === 'PAID' && !refund;
    async function recordRefund(event: FormEvent) {
        event.preventDefault(); setBusy(true); setError('');
        try {
            const saved = persistFinancialIntent(adminId, { operation: 'manualRefund', resourceId: order.id, body: { payment_reference: reference.toUpperCase().replace(/[^A-Z0-9]/g, ''), independently_verified: true, reason: notes } }, manualStorage);
            await sendFinancialIntent(adminId, saved, manualStorage);
            setDone(true); onChanged();
        } catch (cause) { setError(financeError(cause)); } finally { setBusy(false); }
    }
    return <div className="space-y-4 py-4 text-sm">
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {[['Order ID', order.id], ['Customer ID', row.user_id], ['Provider', order.provider === 'manual' ? 'Verified manual payment' : 'Sandbox'], ['Payment reference', row.reference], ['Price version', order.price_version_id], ['Recorded', financeDate(order.created_at)], ['Order window ends', financeDate(order.expires_at)], ['Plan term', order.valid_days ? `${order.valid_days} days` : 'No timed access']].map(([label, value]) => <div className="flex justify-between gap-4" key={label}>
            <dt className="text-[#8a857f]">{label}</dt>
            <dd className="break-all text-right font-mono text-xs">{value}</dd>
            </div>)}
        </dl>
        {refund && <p className="rounded-xl bg-[#faf9fc] p-3 text-xs leading-5 text-[#77736e]">Refund recorded: {refund.unrecovered_credits} unrecovered credits. The ledger and audit trail keep the full history.</p>}
        {refundable && (done ? <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">Verified refund recorded. Balances and access were reversed from the ledger.</p> : <form onSubmit={event => { void recordRefund(event); }} className="space-y-3 rounded-xl border border-[#eeeae5] p-4">
            <p className="font-medium">Record a verified full refund</p>
            <p className="text-xs leading-5 text-[#8a857f]">Only after the refund is completed externally and verified in the bank or wallet. If a saved request is pending, resolve it in the Purchases tab instead.</p>
            <label htmlFor={`refund-reference-${order.id}`} className="block text-sm">Refund transaction reference<input id={`refund-reference-${order.id}`} required minLength={6} maxLength={100} pattern="[A-Za-z0-9]+" className={financeInput} value={reference} onChange={event => setReference(event.target.value)}/></label>
            <label htmlFor={`refund-notes-${order.id}`} className="block text-sm">Verification notes<input id={`refund-notes-${order.id}`} required minLength={5} maxLength={500} className={financeInput} value={notes} onChange={event => setNotes(event.target.value)}/></label>
            <label htmlFor={`refund-verified-${order.id}`} className="flex items-start gap-3 text-sm"><input id={`refund-verified-${order.id}`} type="checkbox" required checked={verified} onChange={event => setVerified(event.target.checked)}/>I independently verified this completed refund in the bank or wallet.</label>
            {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
            <button className={financeAction} disabled={busy || !verified}>{busy ? 'Recording…' : 'Record verified refund'}</button>
            </form>)}
    </div>;
}
function Payments({ adminId }: {
    adminId: string;
}) {
    const resource = useFinancePage('payments');
    const [query, setQuery] = useState(''), [openId, setOpenId] = useState<string | null>(null);
    const needle = query.trim().toLowerCase();
    const rows = (resource.data ?? []).filter(row => !needle || [row.customer_name ?? '', row.customer_email, row.plan_slug, row.order.state].some(value => value.toLowerCase().includes(needle)));
    return <div className="space-y-5">
    <form onSubmit={event => event.preventDefault()} className="flex gap-2">
    <label className="flex-1" htmlFor="payment-search">
    <span className="sr-only">Search payments</span>
    <input id="payment-search" className={financeInput} maxLength={100} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by customer, email or plan"/>
    </label>
    </form>
    <FinancePanel title="Payments" resource={resource}>
    <p className="mb-4 text-xs text-[#8a857f]">Manual purchases and historical sandbox records. Open a payment for its technical details or to record a verified refund.</p>{!rows.length ? <FinanceEmpty>{needle ? 'No payments match this search.' : 'No payment orders recorded.'}</FinanceEmpty> : <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="text-xs text-[#8a857f]">
        <tr>{['Customer', 'Plan', 'Amount paid', 'Credits granted', 'Activation date', 'Expiration date', 'Payment status', ''].map((x, i) => <th scope="col" className="pb-3 font-medium" key={i}>{x}</th>)}</tr>
        </thead>
        {rows.map(row => <tbody key={row.order.id}>
            <tr className="border-t border-[#eeeae5]">
            <td className="py-4 pr-4">
            <p className="font-medium">{row.customer_name ?? row.customer_email}</p>
            <p className="mt-1 text-xs text-[#8a857f]">{row.customer_name ? row.customer_email : (row.order.provider === 'manual' ? 'Verified manual payment' : 'Sandbox')}</p>
            </td>
            <td className="pr-4 capitalize">{row.plan_slug || '—'}</td>
            <td className="tabular-nums">{formatPaisa(row.order.amount_paisa)}</td>
            <td className="tabular-nums">{row.order.credits.toLocaleString()}</td>
            <td className="pr-4">{row.order.paid_at ? financeDate(row.order.paid_at) : '—'}</td>
            <td className="pr-4">{row.access_ends_at ? financeDate(row.access_ends_at) : (row.order.valid_days ? '—' : 'No expiry')}</td>
            <td>
            <FinanceBadge>{row.order.state}</FinanceBadge>{row.refund && <p className="mt-1 text-xs text-[#8a857f]">Refunded</p>}
            </td>
            <td className="py-3">
            <button className={financeAction} onClick={() => setOpenId(openId === row.order.id ? null : row.order.id)}>{openId === row.order.id ? 'Hide' : 'Details'}</button>
            </td>
            </tr>
            {openId === row.order.id && <tr className="border-t border-[#f4f1ec]">
            <td colSpan={8}>
            <PaymentDetails row={row} adminId={adminId} onChanged={() => { void resource.refresh(); }}/>
            </td>
            </tr>}
        </tbody>)}
        </table>
        </div>}<FinancePager page={resource} cursor={resource.data?.length === 20 ? resource.data.at(-1)?.order.id : null}/></FinancePanel>
    </div>;
}
function FinancialAction({ adminId, action, pending, onClose, onChanged }: {
    adminId: string;
    action: Action | null;
    pending: FinancialIntent | null;
    onClose: () => void;
    onChanged: () => void;
}) {
    const [intent, setIntent] = useState(pending), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(false);
    const controller = useRef<AbortController | null>(null);
    const dialog = useRef<HTMLElement | null>(null);
    useEffect(() => {
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.current?.querySelector<HTMLElement>('button, input, select, textarea')?.focus();
        return () => previous?.focus();
    }, []);
    useEffect(() => () => controller.current?.abort(), []);
    const plans = useWorkspaceResource('plans');
    const [amount, setAmount] = useState(''), [reason, setReason] = useState(''), [selectedPrice, setSelectedPrice] = useState('');
    const plan = action?.kind === 'plan' ? action.plan : null;
    const [planFields, setPlanFields] = useState({ price_paisa: plan?.price ? String(plan.price.price_paisa) : '', included_credits: plan?.price ? String(plan.price.included_credits) : '', valid_days: plan?.price ? String(plan.price.valid_days) : '', approved: plan?.price?.approved ?? false });
    const [rules, setRules] = useState<Record<string, string>>(() => Object.fromEntries(Object.keys(ruleLabels).map(key => [key, plan?.price ? String(plan.price.rules[key as keyof typeof plan.price.rules]) : ''])));
    async function send(value: FinancialIntent) {
        if (busy)
            return;
        setBusy(true);
        setError('');
        controller.current = new AbortController();
        try {
            await sendFinancialIntent(adminId, value, sessionStorage, undefined, controller.current.signal);
            setIntent(null);
            setSuccess(true);
            onChanged();
        }
        catch (error) {
            if (!controller.current.signal.aborted) {
                setError(financeError(error));
                try {
                    if (!readFinancialIntent(adminId, sessionStorage))
                        setIntent(null);
                }
                catch { /* Keep the pending request locked if storage cannot be read. */ }
            }
        }
        finally {
            if (!controller.current?.signal.aborted)
                setBusy(false);
        }
    }
    async function submit(event: FormEvent) {
        event.preventDefault();
        if (busy || intent || !action)
            return;
        try {
            let value: FinancialIntent;
            if (action.kind === 'credit')
                value = persistFinancialIntent(adminId, { operation: 'adjustCredits', resourceId: action.customer.id, body: { amount: Number(amount), reason } }, sessionStorage);
            else if (action.kind === 'access')
                value = persistFinancialIntent(adminId, { operation: 'grantAccess', resourceId: action.customer.id, body: { price_version_id: selectedPrice, reason } }, sessionStorage);
            else if (action.kind === 'plan')
                value = persistFinancialIntent(adminId, { operation: 'configurePlan', resourceId: action.plan.id, body: { price_paisa: Number(planFields.price_paisa), included_credits: Number(planFields.included_credits), valid_days: Number(planFields.valid_days) as 0 | 30, approved: planFields.approved, rules: consumptionRules(rules, action.plan.price?.rules), reason } }, sessionStorage);
            else
                throw new Error('Unknown financial action');
            setIntent(value);
            await send(value);
        }
        catch (error) {
            setError(financeError(error));
        }
    }
    const target = action?.kind === 'plan' ? action.plan.slug : action?.customer.email ?? intent?.resourceId;
    return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#28253a]/30 p-4 backdrop-blur-sm">
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="financial-action-title" onKeyDown={event => {
        if (event.key === 'Escape' && !busy) {event.preventDefault(); onClose()}
        if (event.key === 'Tab') {
            const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)') ?? []);
            const first = controls[0], last = controls.at(-1);
            if (!controls.length) {event.preventDefault(); dialog.current?.focus(); return}
            if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus()}
            else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus()}
        }
    }} className="my-auto max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl sm:p-8">
    <div className="mb-5 flex items-start justify-between gap-4">
    <div>
    <p className="text-xs font-medium text-[#7668df]">Audited administration</p>
    <h2 id="financial-action-title" className="mt-2 text-2xl font-semibold tracking-tight">{pending ? 'Resolve pending request' : action?.kind === 'plan' ? 'Create a plan version' : action?.kind === 'access' ? 'Grant reviewed access' : 'Adjust credits'}</h2>
    <p className="mt-2 break-all text-sm text-[#77736e]">{target}</p>
    </div>
    <button aria-label="Close management dialog" disabled={busy} onClick={onClose} className={financeAction}>
    <X size={16}/>
    </button>
    </div>
    {success ? <div role="status" className="rounded-xl bg-emerald-50 p-5 text-sm text-emerald-900">The server confirmed the audited change. Refresh the customer or catalog view to review the result.</div> : intent ? <div className="space-y-4">
        <p className="rounded-xl bg-[#f2efff] p-4 text-sm leading-6 text-[#6558c8]">This request is saved for this administrator. Its result may be uncertain. Retry uses the original request key and exact details; another financial action is blocked until it is resolved.</p>
        <dl className="space-y-2 text-sm">
        <div>
        <dt className="text-[#8a857f]">Action</dt>
        <dd>{intent.operation === 'adjustCredits' ? `Credit adjustment: ${'amount' in intent.body ? intent.body.amount : ''}` : intent.operation === 'grantAccess' ? 'Plan access grant' : 'Plan version creation'}</dd>
        </div>
        <div>
        <dt className="text-[#8a857f]">Reason</dt>
        <dd>{intent.body.reason}</dd>
        </div>
        </dl>
        <button disabled={busy} className={financeAction} onClick={() => { void send(intent); }}>{busy ? 'Checking original request…' : 'Retry original request'}</button>
        </div> : <form onSubmit={event => { void submit(event); }} className="space-y-4">
        <p className="rounded-xl bg-[#faf9fc] p-4 text-xs leading-5 text-[#77736e]">Review the exact change before confirming. Every action requires a reason and is recorded permanently. This does not create payment evidence.</p>
      {action?.kind === 'credit' && <>
            <label htmlFor="adjust-credit" className="block text-sm font-medium">Signed credit adjustment<input id="adjust-credit" required type="number" step="1" min="-1000000000000" max="1000000000000" className={financeInput} value={amount} onChange={e => setAmount(e.target.value)}/>
            </label>
            <p className="text-xs text-[#8a857f]">Positive values grant credits; negative values deduct available credits. Last loaded: {action.customer.available_credits} available / {action.customer.reserved_credits} reserved.</p>
            </>}
      {action?.kind === 'access' && <><label htmlFor="grant-price" className="block text-sm font-medium">Existing reviewed plan version<select id="grant-price" required className={financeInput} value={selectedPrice} onChange={e => setSelectedPrice(e.target.value)}>
            <option value="">Select configured terms</option>{plans.data?.filter(p => p.enabled && p.price?.approved).map(p => <option key={p.id} value={p.price!.id}>{p.slug} · {p.price!.included_credits} credits · {p.price!.valid_days} days</option>)}</select>
            <span className="mt-2 block text-xs font-normal text-[#8a857f]">This staff award can grant the configured allowance. It is not a paid subscription or a checkout. Only approved terms appear here.</span>
            </label>{plans.status === 'error' && <p role="alert" className="text-sm text-red-800">{financeError(plans.error)} <button type="button" className={financeAction} onClick={() => {void plans.refresh()}}>Reload plans</button></p>}{plans.status === 'ready' && !plans.data?.some(p => p.enabled && p.price?.approved) && <FinanceEmpty>No approved plan terms are available for a staff award.</FinanceEmpty>}</>}
      {action?.kind === 'plan' && <>
            <div className="grid gap-4 sm:grid-cols-2">{(['price_paisa', 'included_credits'] as const).map(key => <label className="block text-sm font-medium" key={key}>{key === 'price_paisa' ? 'Price in PKR paisa (integer)' : 'Included credits'}<input required min="0" max="1000000000000" step="1" type="number" className={financeInput} value={planFields[key]} onChange={e => setPlanFields(v => ({ ...v, [key]: e.target.value }))}/>
                </label>)}<label htmlFor="prepaid-validity" className="block text-sm font-medium">Prepaid validity<select id="prepaid-validity" required className={financeInput} value={planFields.valid_days} onChange={e => setPlanFields(v => ({ ...v, valid_days: e.target.value }))}>
            <option value="">Select validity</option>
            <option value="0">No timed validity</option>
            <option value="30">30 days prepaid</option>
            </select>
            </label>
            <label htmlFor="terms-approved" className="flex items-center gap-3 text-sm">
            <input id="terms-approved" type="checkbox" checked={planFields.approved} onChange={e => setPlanFields(v => ({ ...v, approved: e.target.checked }))}/> Commercial terms explicitly approved</label>
            </div>
            <fieldset className="grid gap-3 rounded-xl border border-[#eeeae5] p-4 sm:grid-cols-2">
            <legend className="px-2 text-sm font-medium">Reviewed consumption limits</legend>{Object.entries(ruleLabels).map(([key, label]) => <label className="block text-xs text-[#77736e]" key={key}>{label}<input required type="number" min="0" max="1000000000000" step="1" className={financeInput} value={rules[key]} onChange={e => setRules(v => ({ ...v, [key]: e.target.value }))}/>
                </label>)}</fieldset>
            </>}
      <label htmlFor="financial-reason" className="block text-sm font-medium">Reason for this change<textarea id="financial-reason" required minLength={5} maxLength={500} rows={3} className={financeInput} value={reason} onChange={e => setReason(e.target.value)}/>
        </label>
        <button className={`${financeAction} w-full !bg-[#28253a] !text-white`} disabled={busy || plans.status === 'loading'}>Confirm reviewed change</button>
        </form>}{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}</section>
    </div>;
}
export default function AdminDashboard({ user, onChanged }: {
    user: User;
    onChanged: () => void;
}) {
    if (user.role !== 'admin')
        return <div role="alert" className="rounded-2xl border border-[#e8e4de] bg-white p-8">
        <LockKeyhole className="mb-4 text-[#7668df]"/>
        <h1 className="text-2xl font-semibold">Administrator access required</h1>
        <p className="mt-3 text-sm text-[#77736e]">This account cannot view or change administrative data.</p>
        </div>;
    return <AdminContent key={user.id} user={user} onChanged={onChanged}/>;
}
function AdminContent({ user, onChanged }: {
    user: User;
    onChanged: () => void;
}) {
    const [tab, setTab] = useState('Overview'), [action, setAction] = useState<Action | null>(null), [pending, setPending] = useState<FinancialIntent | null>(null), [revision, setRevision] = useState(0), [storageError, setStorageError] = useState(''), [showPending, setShowPending] = useState(false);
    useEffect(() => { try {
        setPending(readFinancialIntent(user.id, sessionStorage));
    }
    catch {
        setStorageError('Financial request storage is unavailable or invalid. Management actions are disabled until it is resolved.');
    } }, [user.id]);
    function selectAction(value: Action) { if (pending)
        setShowPending(true);
    else if (!storageError)
        setAction(value); }
    function close() { setAction(null); setShowPending(false); try {
        setPending(readFinancialIntent(user.id, sessionStorage));
    }
    catch {
        setStorageError('Unable to read pending financial request. Management is disabled.');
    } }
    return <div className="space-y-6">
    <FinanceHeading title="The control room.">A clear view of customers, credit activity, jobs and financial exposure. Administrative changes retain the existing ledger, permissions and audit trail.</FinanceHeading>
    <div className="flex items-center gap-2 text-xs text-[#6558c8]">
    <ShieldCheck size={15}/> Administrator · {user.email}</div>{storageError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{storageError}</p>}{pending && !action && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f2efff] p-4 text-sm text-[#6558c8]">
        <p>A financial request needs resolution before another change.</p>
        <button className={financeAction} onClick={() => setShowPending(true)}>Resolve pending request</button>
        </div>}<nav aria-label="Administration" className="flex gap-2 overflow-x-auto pb-2">{['Overview', 'Purchases', 'Customers', 'Plans', 'Jobs', 'Payments', 'Audit trail'].map(value => <button key={value} className={`${financeAction} shrink-0 ${tab === value ? '!bg-[#28253a] !text-white' : ''}`} aria-current={tab === value ? 'page' : undefined} onClick={() => setTab(value)}>{value}</button>)}</nav>
    <div key={`${tab}:${revision}`}>{tab === 'Overview' ? <Overview /> : tab === 'Purchases' ? <ManualPurchases adminId={user.id}/> : tab === 'Customers' ? <Customers onAction={selectAction}/> : tab === 'Plans' ? <Plans onAction={selectAction}/> : tab === 'Jobs' ? <Jobs /> : tab === 'Payments' ? <Payments adminId={user.id}/> : <Audits />}</div>{(action || (pending && showPending)) && <FinancialAction key={pending?.key ?? (action?.kind === 'plan' ? action.plan.id : action?.customer.id)} adminId={user.id} action={action} pending={pending} onClose={close} onChanged={() => { setPending(null); setRevision(v => v + 1); onChanged(); }}/>}</div>;
}
