'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { mediaApi, type MediaSchemas } from '@/lib/media-api'
import { useWorkspaceResource } from '@/lib/use-workspace'
import { financeError, formatPaisa } from '@/lib/billing'
import { readFinancialIntent, persistFinancialIntent, sendFinancialIntent, type FinancialIntent } from '@/lib/finance-actions'
import { financeAction, financeInput } from './finance-ui'

const storage = {getItem:(key:string)=>sessionStorage.getItem(`manual:${key}`),setItem:(key:string,value:string)=>sessionStorage.setItem(`manual:${key}`,value),removeItem:(key:string)=>sessionStorage.removeItem(`manual:${key}`)}
type FoundUser = MediaSchemas['ManualUserView']

export default function ManualPurchases({adminId}:{adminId:string}) {
  const plans=useWorkspaceResource('plans')
  const [name,setName]=useState(''),[email,setEmail]=useState(''),[planSlug,setPlanSlug]=useState(''),[amount,setAmount]=useState('')
  const [step,setStep]=useState<'details'|'verify'>('details'),[user,setUser]=useState<FoundUser|null>(null)
  const [reference,setReference]=useState(''),[reason,setReason]=useState(''),[verified,setVerified]=useState(false)
  const [intent,setIntent]=useState<FinancialIntent|null>(null),[intentBroken,setIntentBroken]=useState(false)
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
  const plan=plans.data?.find(row=>row.slug===planSlug&&row.price?.approved&&row.price.rules.purchasable)
  useEffect(()=>{try{setIntent(readFinancialIntent(adminId,storage))}catch{setIntentBroken(true)}},[adminId])
  function discardIntent() {
    storage.removeItem(`zoclip-financial-intent:${adminId}`);setIntentBroken(false);setError('')
    setMessage('The saved request was discarded. It could not be sent in its saved form; payment references are still protected against reuse, so re-entering the payment is safe.')
  }
  async function send(saved:FinancialIntent) {
    setBusy(true);setError('');setMessage('')
    try {await sendFinancialIntent(adminId,saved,storage);setIntent(null);setStep('details');setUser(null);setReference('');setReason('');setVerified(false);setMessage('Plan activated. The customer balance and 30-day expiry are updated — check the Customers or Payments tab.')}catch(cause){try{setIntent(readFinancialIntent(adminId,storage))}catch{setIntentBroken(true)}setError(financeError(cause))}finally{setBusy(false)}
  }
  async function findAccount(event:FormEvent) {
    event.preventDefault();setError('');setMessage('');setUser(null)
    if(!plan){setError('Choose the Creator or Pro plan the customer paid for.');return}
    const paisa=Math.round(Number(amount)*100)
    if(!Number.isFinite(paisa)||paisa<=0){setError('Enter the amount received in PKR.');return}
    if(paisa!==plan.price!.price_paisa){setError(`The amount received must be the full ${planSlug === 'creator' ? 'Creator' : 'Pro'} price of ${formatPaisa(plan.price!.price_paisa)}. A different amount cannot activate this plan.`);return}
    setBusy(true)
    try {
      const result=await mediaApi.call('manualUsers',{query:{email:email.trim()}})
      const found=result[0]??null
      if(!found){setError('No registered account matches this email. Ask the customer to register with this exact email first, then activate the plan.');return}
      if(!found.verified){setError('This account has not verified its email yet. The customer must verify before a plan can be activated.');return}
      if(found.status!=='active'){setError('This account is not active, so a plan cannot be activated for it.');return}
      setUser(found);setStep('verify')
    }catch(cause){setError(financeError(cause))}finally{setBusy(false)}
  }
  async function activate(event:FormEvent) {
    event.preventDefault();if(!user||!plan||!verified||intent)return
    try {
      const saved=persistFinancialIntent(adminId,{operation:'manualActivate',resourceId:user.id,body:{price_version_id:plan.price!.id,amount_paisa:plan.price!.price_paisa,customer_name:name.trim(),payment_reference:reference,independently_verified:true,reason}},storage)
      setIntent(saved);await send(saved)
    }catch(cause){setError(financeError(cause))}
  }
  return <section className="space-y-5 rounded-2xl border border-[#eeeae5] bg-white p-5">
    <h2 className="text-xl font-semibold">Activate a plan</h2>
    <p className="text-sm leading-6 text-[#77736e]">Enter the four purchase details. ZoClip finds the registered account, then asks for the payment verification step — a plan is never activated from an unverified payment. To record a refund instead, open the payment in the Payments tab.</p>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}{message&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">{message}</p>}
    {intentBroken?<div className="space-y-3 rounded-xl bg-[#f2efff] p-4 text-sm leading-6 text-[#6558c8]"><p>A saved financial request can no longer be read in its saved form, so it cannot be sent. Discard it and re-enter the payment — references already recorded stay protected against reuse.</p><button className={financeAction} onClick={discardIntent}>Discard saved request</button></div>
    :intent?<div className="space-y-3"><p className="text-sm">An earlier {intent.operation==='manualRefund'?'refund':'activation'} request needs confirmation. Retry its original key; do not enter another payment.</p><p className="break-all font-mono text-xs">Request {intent.key} · Account/order {intent.resourceId}</p><button disabled={busy} className={financeAction} onClick={()=>{void send(intent)}}>Check original request</button></div>
    :step==='details'?<form onSubmit={event=>{void findAccount(event)}} className="grid gap-4 sm:grid-cols-2">
      <label htmlFor="purchase-name" className="block text-sm">Customer Name<input id="purchase-name" required minLength={2} maxLength={120} className={financeInput} value={name} onChange={event=>setName(event.target.value)} placeholder="Name the customer paid with"/></label>
      <label htmlFor="purchase-email" className="block text-sm">Registered Email<input id="purchase-email" type="email" required maxLength={320} className={financeInput} value={email} onChange={event=>setEmail(event.target.value)} placeholder="customer@example.com"/></label>
      <label htmlFor="purchase-plan" className="block text-sm">Plan<select id="purchase-plan" required className={financeInput} value={planSlug} onChange={event=>setPlanSlug(event.target.value)}><option value="">Choose a plan</option>{plans.data?.filter(row=>['creator','pro'].includes(row.slug)&&row.price?.approved&&row.price.rules.purchasable).map(row=><option key={row.id} value={row.slug}>{row.slug === 'creator' ? 'Creator' : 'Pro'} · {formatPaisa(row.price!.price_paisa)}</option>)}</select>{plan&&<span className="mt-2 block text-xs font-normal text-[#8a857f]">{plan.price!.included_credits.toLocaleString()} credits · {plan.price!.valid_days} days · 50 credits per delivered clip</span>}</label>
      <label htmlFor="purchase-amount" className="block text-sm">Amount Received (PKR)<input id="purchase-amount" type="number" min="1" step="1" required className={financeInput} value={amount} onChange={event=>setAmount(event.target.value)} placeholder={plan ? String(plan.price!.price_paisa / 100) : '1000'}/></label>
      <div className="sm:col-span-2"><button disabled={busy||plans.status==='loading'} className={`${financeAction} !bg-[#28253a] !text-white`}>{busy ? 'Finding account…' : 'Activate Plan'}</button></div>
    </form>
    :user&&plan&&<form onSubmit={event=>{void activate(event)}} className="space-y-4">
      <div className="rounded-xl bg-[#faf9fc] p-4 text-sm leading-6">
        <p className="font-medium">{name.trim()} · {user.email}</p>
        <p className="text-[#77736e]">{planSlug === 'creator' ? 'Creator' : 'Pro'} · {formatPaisa(plan.price!.price_paisa)} received · {plan.price!.included_credits.toLocaleString()} credits · {plan.price!.valid_days} days from activation</p>
        <p className="text-[#77736e]">Account verified · {user.available_credits} credits currently available</p>
      </div>
      <p className="text-sm font-medium">Payment verification</p>
      <p className="-mt-2 text-sm leading-6 text-[#77736e]">Verify receipt in the bank or wallet independently. A screenshot alone is insufficient. This records a completed external payment; it never sends money.</p>
      <label htmlFor="purchase-reference" className="block text-sm">Bank/wallet transaction reference<input id="purchase-reference" required minLength={6} maxLength={100} pattern="[A-Za-z0-9 .:_-]+" className={financeInput} value={reference} onChange={event=>setReference(event.target.value)}/></label>
      <label htmlFor="purchase-notes" className="block text-sm">Verification notes<input id="purchase-notes" required minLength={5} maxLength={500} className={financeInput} value={reason} onChange={event=>setReason(event.target.value)}/></label>
      <label htmlFor="purchase-verified" className="flex items-start gap-3 text-sm"><input id="purchase-verified" type="checkbox" required checked={verified} onChange={event=>setVerified(event.target.checked)}/>I independently verified this exact account, amount and completed transaction in the bank or wallet.</label>
      <div className="flex flex-wrap gap-2"><button className={`${financeAction} !bg-[#28253a] !text-white`} disabled={busy||!verified}>Confirm activation</button><button type="button" className={financeAction} disabled={busy} onClick={()=>{setStep('details');setVerified(false)}}>Back</button></div>
    </form>}
  </section>
}
