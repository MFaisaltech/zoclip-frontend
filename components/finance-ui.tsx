'use client';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { financeError } from '@/lib/billing';
export const financeAction = 'inline-flex items-center justify-center gap-2 rounded-xl border border-[#ddd7ed] bg-white px-4 py-2.5 text-sm font-medium text-[#6457c8] transition hover:bg-[#f2efff] disabled:cursor-not-allowed disabled:opacity-50';
export const financeInput = 'mt-1 w-full rounded-xl border border-[#ded9e5] bg-[#fcfbfe] px-3 py-2.5 text-sm outline-none focus:border-[#7668df] focus:ring-2 focus:ring-[#7668df]/15 disabled:opacity-60';
export function FinanceHeading({ title, children }: {
    title: string;
    children: ReactNode;
}) {
    return <div className="mb-7">
    <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7668df]">
    <ShieldCheck size={14}/> ZoClip / Finance</p>
    <h1 className="text-3xl font-semibold tracking-[-0.06em] sm:text-4xl">{title}</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#77736e]">{children}</p>
    </div>;
}
export function FinancePanel({ title, resource, children }: {
    title: string;
    resource: {
        loading: boolean;
        error: unknown;
        refresh: () => void;
    };
    children: ReactNode;
}) {
    return <section aria-label={title} className="rounded-2xl border border-[#e8e4de] bg-white p-5 shadow-[0_2px_12px_rgba(40,37,58,0.02)] sm:p-6">
    <div className="mb-5 flex items-center justify-between gap-3">
    <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    <button className={financeAction} onClick={resource.refresh} disabled={resource.loading} aria-label={`Refresh ${title}`}>
    <RefreshCw size={14}/>
    <span className="hidden sm:inline">Refresh</span>
    </button>
    </div>{resource.loading ? <div role="status" className="space-y-3 animate-pulse">
        <div className="h-5 w-1/3 rounded bg-[#f1eef8]"/>
        <div className="h-20 rounded-xl bg-[#f8f6fb]"/>
        <span className="sr-only">Loading {title}</span>
        </div> : resource.error ? <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{financeError(resource.error)}</div> : children}</section>;
}
export function FinanceEmpty({ children }: {
    children: ReactNode;
}) { return <div className="rounded-xl border border-dashed border-[#e1dceb] bg-[#faf9fc] p-7 text-center text-sm leading-6 text-[#77736e]">{children}</div>; }
export function FinanceStat({ label, value, hint }: {
    label: string;
    value: ReactNode;
    hint?: string;
}) {
    return <div className="rounded-2xl border border-[#e8e4de] bg-white p-5">
    <p className="text-xs font-medium text-[#8a857f]">{label}</p>
    <p className="mt-3 text-3xl font-semibold tracking-[-0.055em] tabular-nums">{value}</p>{hint && <p className="mt-2 text-xs leading-5 text-[#8a857f]">{hint}</p>}</div>;
}
export function FinanceBadge({ children }: {
    children: ReactNode;
}) { return <span className="inline-flex rounded-full bg-[#f1eefc] px-2.5 py-1 text-[11px] font-semibold text-[#6457c8]">{children}</span>; }
export function FinancePager({ page, cursor }: {
    page: {
        hasPrevious: boolean;
        loading: boolean;
        previous: () => void;
        next: (value: string) => void;
    };
    cursor?: string | null;
}) {
    return <div className="mt-5 flex items-center justify-between gap-2 border-t border-[#eeeae5] pt-4">
    <button className={financeAction} disabled={!page.hasPrevious || page.loading} onClick={page.previous}>Previous</button>
    <p className="text-xs text-[#8a857f]">{cursor ? 'More records available' : 'End of records'}</p>
    <button className={financeAction} disabled={!cursor || page.loading} onClick={() => { if (cursor)
        page.next(cursor); }}>Next</button>
    </div>;
}
export const financeDate = (value: string) => new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' });
