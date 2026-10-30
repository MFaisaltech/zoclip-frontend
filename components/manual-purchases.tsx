'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { mediaApi, type MediaSchemas } from '@/lib/media-api'
import { useWorkspaceResource } from '@/lib/use-workspace'
import { financeError, formatPaisa } from '@/lib/billing'
import { readFinancialIntent, persistFinancialIntent, sendFinancialIntent, type FinancialIntent } from '@/lib/finance-actions'
import { financeAction, financeInput } from './finance-ui'

const storage = {getItem:(key:string)=>sessionStorage.getItem(`manual:${key}`),setItem:(key:string,value:string)=>sessionStorage.setItem(`manual:${key}`,value),removeItem:(key:string)=>sessionStorage.removeItem(`manual:${key}`)}
export default function ManualPurchases({adminId}:{adminId:string}) {
  const plans=useWorkspaceResource('plans')
  const [email,setEmail]=useState(''),[user,setUser]=useState<MediaSchemas['ManualUserView']|null>(null)
  const [price,setPrice]=useState(''),[amount,setAmount]=useState(''),[reference,setReference]=useState(''),[reason,setReason]=useState(''),[verified,setVerified]=useState(false)
  const [intent,setIntent]=useState<FinancialIntent|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
  const [orders,setOrders]=useState<MediaSchemas['StaffOrderView'][]>([]),[refundOrder,setRefundOrder]=useState('')
  useEffect(()=>{try{setIntent(readFinancialIntent(adminId,storage))}catch(cause){setError(financeError(cause))}},[adminId])
  async function search(event:FormEvent) {
    event.preventDefault();setBusy(true);setError('');setMessage('');setUser(null);setRefundOrder('');setPrice('');setVerified(false)
    try {const result=await mediaApi.call('manualUsers',{query:{email:email.trim()}});setUser(result[0]??null);if(!result.length)setMessage('No registered account matches this email.');setOrders(await mediaApi.call('payments',{query:{limit:100}}))}catch(cause){setError(financeError(cause))}finally{setBusy(false)}
  }
  async function send(saved:FinancialIntent) {
    setBusy(true);setError('');setMessage('')
    try {await sendFinancialIntent(adminId,saved,storage);setIntent(null);setMessage('Verified transaction recorded. Refresh the account to check its updated balance.');setVerified(false);setReference('');setOrders(await mediaApi.call('payments',{query:{limit:100}}))}catch(cause){setIntent(readFinancialIntent(adminId,storage));setError(financeError(cause))}finally{setBusy(false)}
  }
  async function submit(event:FormEvent) {
    event.preventDefault();if(!user||!verified||intent)return
    try {
      const saved=persistFinancialIntent(adminId,refundOrder?{operation:'manualRefund',resourceId:refundOrder,body:{payment_reference:reference.toUpperCase().replace(/[^A-Z0-9]/g,''),independently_verified:true,reason}}:{operation:'manualActivate',resourceId:user.id,body:{price_version_id:price,amount_paisa:Number(amount)*100,payment_reference:reference,independently_verified:true,reason}},storage)
      setIntent(saved);await send(saved)
    }catch(cause){setError(financeError(cause))}
  }
  return <section className="space-y-5 rounded-2xl border border-[#eeeae5] bg-white p-5">
    <h2 className="text-xl font-semibold">Verified WhatsApp purchases</h2><p className="text-sm leading-6 text-[#77736e]">Verify receipt in the bank or wallet independently. A screenshot alone is insufficient. This records a completed external payment or refund; it never sends money.</p>
    {error&&<p role="alert" className="text-sm text-red-800">{error}</p>}{message&&<p role="status" className="text-sm">{message}</p>}
    {intent?<div className="space-y-3"><p className="text-sm">An earlier {intent.operation==='manualRefund'?'refund':'activation'} request needs confirmation. Retry its original key; do not enter another payment.</p><p className="break-all font-mono text-xs">Request {intent.key} · Account/order {intent.resourceId}</p><button disabled={busy} className={financeAction} onClick={()=>{void send(intent)}}>Check original request</button></div>:<>
      <form onSubmit={event=>{void search(event)}} className="flex flex-wrap gap-3"><label htmlFor="manual-email" className="flex-1 text-sm">Registered email<input id="manual-email" type="email" required maxLength={320} value={email} onChange={event=>setEmail(event.target.value)} className={financeInput}/></label><button disabled={busy} className={financeAction}>Find user</button></form>
      {user&&<><p className="break-words text-sm">{user.email} · {user.verified?'Verified':'Unverified'} · {user.status} · {user.available_credits} available / {user.reserved_credits} held</p>
        <form onSubmit={event=>{void submit(event)}} className="space-y-4">
          <label htmlFor="manual-action" className="block text-sm">Action<select id="manual-action" className={financeInput} value={refundOrder} onChange={event=>{setRefundOrder(event.target.value);setVerified(false)}}><option value="">Activate verified purchase</option>{orders.filter(row=>row.user_id===user.id&&row.order.provider==='manual'&&row.order.state==='PAID').map(row=><option value={row.order.id} key={row.order.id}>Record verified full refund: {formatPaisa(row.order.amount_paisa)} · {row.order.id}</option>)}</select></label>
          {!refundOrder&&<><label htmlFor="manual-package" className="block text-sm">Purchased package<select id="manual-package" required className={financeInput} value={price} onChange={event=>setPrice(event.target.value)}><option value="">Choose reviewed terms</option>{plans.data?.filter(plan=>['creator','pro'].includes(plan.slug)&&plan.price?.approved&&plan.price.rules.purchasable).map(plan=><option key={plan.id} value={plan.price!.id}>{plan.slug} · {formatPaisa(plan.price!.price_paisa)} · {plan.price!.included_credits} credits</option>)}</select></label><label htmlFor="manual-amount" className="block text-sm">Verified amount received (PKR)<input id="manual-amount" className={financeInput} type="number" min="1" step="1" required value={amount} onChange={event=>setAmount(event.target.value)}/></label></>}
          <label htmlFor="manual-reference" className="block text-sm">Bank/wallet transaction reference{refundOrder?' for the completed refund':''}<input id="manual-reference" required minLength={6} maxLength={100} pattern="[A-Za-z0-9 .:_-]+" className={financeInput} value={reference} onChange={event=>setReference(event.target.value)}/></label>
          <label htmlFor="manual-notes" className="block text-sm">Verification notes<input id="manual-notes" required minLength={5} maxLength={500} className={financeInput} value={reason} onChange={event=>setReason(event.target.value)}/></label>
          <label htmlFor="manual-verified" className="flex items-start gap-3 text-sm"><input id="manual-verified" type="checkbox" required checked={verified} onChange={event=>setVerified(event.target.checked)}/>I independently verified this exact account, amount and completed transaction in the bank or wallet.</label>
          <button className={financeAction} disabled={busy||!verified||(!refundOrder&&(!user.verified||user.status!=='active'))}>{refundOrder?'Record verified full refund':'Activate purchased package'}</button>
        </form>
      </>}
    </>}
  </section>
}
