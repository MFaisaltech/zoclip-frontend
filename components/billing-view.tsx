'use client';
import { useState, type ReactNode } from 'react';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';
import { useFinance, useFinancePage } from '@/lib/use-finance';
import { formatPaisa, ruleLabels } from '@/lib/billing';
import { FinanceHeading, FinancePanel, FinanceEmpty, FinanceBadge, FinanceStat, FinancePager, financeAction, financeDate } from './finance-ui';
export default function BillingView({ wallet, ledger, access, catalog }: {
    wallet: ReactNode;
    ledger: ReactNode;
    access: ReactNode;
    catalog: ReactNode;
}) {
    const [tab, setTab] = useState<'billing' | 'plans'>('billing');
    const overview = useFinance('billingOverview');
    const reservations = useFinancePage('reservations');
    const orders = useFinancePage('billingHistory');
    const data = overview.data;
    const price = data?.plan?.price;
    return <div className="space-y-6">
    <FinanceHeading title="Your credits. Your control.">Keep track of every credit, see what is reserved for work, and find the right plan for your next project.</FinanceHeading>
    <div className="flex gap-2" role="tablist" aria-label="Billing sections">{(['billing', 'plans'] as const).map(value => <button key={value} role="tab" aria-selected={tab === value} className={`${financeAction} ${tab === value ? '!bg-[#28253a] !text-white' : ''}`} onClick={() => setTab(value)}>{value === 'billing' ? 'Billing & usage' : 'Plans & upgrades'}</button>)}</div>
    {tab === 'billing' ? <>
      {wallet}
      <FinancePanel title="Your current plan" resource={overview}>{data && <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
            <FinanceBadge>{data.access_source === 'entitlement' ? 'Active access' : data.plan ? 'Default access' : 'Not configured'}</FinanceBadge>
            <h3 className="mt-4 text-2xl font-semibold capitalize tracking-tight">{data.plan?.slug ?? 'Plan awaiting configuration'}</h3>
            <p className="mt-2 text-sm text-[#77736e]">{data.access_ends_at ? `Access until ${financeDate(data.access_ends_at)}` : data.plan ? 'No timed access period' : 'Your available balance is independent of plan access.'} · No automatic renewal</p>{price && <p className="mt-2 text-xs text-[#8a857f]">{price.approved ? 'Approved terms' : 'Terms awaiting commercial approval'} · {price.included_credits.toLocaleString()} included credits per allowance</p>}</div>
            <button className={financeAction} onClick={() => setTab('plans')}>Explore plans <ArrowUpRight size={15}/>
            </button>
            </div>}</FinancePanel>
      <FinancePanel title="Credit usage" resource={overview}>{data && <>
            <div className="grid gap-3 sm:grid-cols-3">
            <FinanceStat label="Daily usage + holds" value={data.daily_used_credits.toLocaleString()} hint={price ? `Limit: ${price.rules.daily_credits.toLocaleString()} credits` : 'Limit not configured'}/>
            <FinanceStat label="Monthly usage + holds" value={data.monthly_used_credits.toLocaleString()} hint={price ? `Limit: ${price.rules.monthly_credits.toLocaleString()} credits` : 'Limit not configured'}/>
            <FinanceStat label="Completed / released credits" value={`${data.settled_credits} / ${data.released_credits}`} hint="Lifetime totals from reservations"/>
            </div>
            <p className="mt-4 text-xs leading-5 text-[#8a857f]">Periods start at midnight UTC. All active holds count toward both limits, including holds from earlier periods. Released holds are excluded. Credits are charged once a deliverable succeeds.</p>
            </>}</FinancePanel>
      <FinancePanel title="Reservations & job holds" resource={reservations}>{!reservations.data?.items.length ? <FinanceEmpty>No credit reservations yet. A reservation appears when you confirm a processing quote.</FinanceEmpty> : <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="text-xs text-[#8a857f]">
            <tr>{['Job', 'Credits', 'State', 'Updated'].map(x => <th className="pb-3 font-medium" scope="col" key={x}>{x}</th>)}</tr>
            </thead>
            <tbody>{reservations.data.items.map(row => <tr key={row.id} className="border-t border-[#eeeae5]">
                <td className="py-4 font-mono text-xs" title={row.job_id}>{row.job_id.slice(0, 8)}</td>
                <td className="tabular-nums">{row.credits.toLocaleString()}</td>
                <td>
                <FinanceBadge>{row.state}</FinanceBadge>
                </td>
                <td className="text-[#8a857f]">{financeDate(row.updated_at)}</td>
                </tr>)}</tbody>
            </table>
            </div>}<FinancePager page={reservations} cursor={reservations.data?.next_cursor}/>
        </FinancePanel>
      {ledger}{access}
      <FinancePanel title="Payment history" resource={orders}>{!orders.data?.items.length ? <FinanceEmpty>No payment orders on this account. Merchant checkout is not available.</FinanceEmpty> : <div className="space-y-3">{orders.data.items.map(order => <article key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eeeae5] p-4">
                <div>
                <p className="font-medium">{formatPaisa(order.amount_paisa)} <span className="ml-2 text-xs text-[#8a857f]">{order.credits} credits</span>
                </p>
                <p className="mt-1 text-xs text-[#8a857f]">{financeDate(order.created_at)} · {order.provider === 'manual' ? 'Independently verified manual purchase' : 'Development sandbox · No real money collected'}</p>
                </div>
                <FinanceBadge>{order.state}</FinanceBadge>
                </article>)}</div>}<FinancePager page={orders} cursor={orders.data?.next_cursor}/>
        </FinancePanel>
    </> : <>
        <div className="rounded-2xl border border-[#e4defd] bg-[#f2efff] p-5">
        <p className="flex items-center gap-2 font-medium text-[#6558c8]">
        <LockKeyhole size={16}/> Buy via WhatsApp</p>
        <p className="mt-2 text-sm leading-6 text-[#77736e]">Ask for verified payment instructions in WhatsApp. Send your registered email and payment screenshot; credits are activated only after independent admin verification. Selecting a plan does not grant credits.</p>
        </div>{catalog}{price && <FinancePanel title="Your applied usage rules" resource={overview}>
            <dl className="grid gap-x-10 gap-y-3 sm:grid-cols-2">{Object.entries(price.rules).map(([key, value]) => <div key={key} className="flex justify-between gap-4 text-sm">
                <dt className="text-[#77736e]">{ruleLabels[key] ?? key}</dt>
                <dd className="font-medium tabular-nums">{typeof value==='number'?value.toLocaleString():value===null?'Not set':value?'Yes':'No'}</dd>
                </div>)}</dl>
            </FinancePanel>}</>}
  </div>;
}
