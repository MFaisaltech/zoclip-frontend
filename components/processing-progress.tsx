'use client'

import { Check, LoaderCircle } from 'lucide-react'

const steps = ['Importing', 'Analyzing', 'Selecting', 'Rendering', 'Completed']
export function processingStage(stage: string, kind: string, state: string): string {
  if (state === 'COMPLETED') return ['IMPORT', 'VALIDATE'].includes(kind) ? 'Video ready' : 'Completed'
  if (state === 'FAILED') return 'Unable to finish'
  if (state === 'CANCELED' || state === 'CANCEL_REQUESTED') return 'Canceling'
  if (stage.includes('RENDER') || kind === 'RENDER') return 'Rendering'
  if (stage === 'ANALYZING' || stage === 'SUGGESTIONS_READY') return 'Selecting'
  if (['IMPORT', 'VALIDATE'].includes(kind)) return 'Importing'
  return 'Analyzing'
}

export function ProcessingProgress({stage, percent, detail, active = true}: {
  stage: string; percent?: number | null; detail?: string; active?: boolean;
}) {
  const index = steps.indexOf(stage)
  const measured = typeof percent === 'number' && Number.isFinite(percent) && percent >= 0 && percent <= 100
  return <div aria-label="Processing progress" className="rounded-2xl border border-[#e5dff0] bg-[#faf8ff] p-5">
    <div role="status" className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2.5 font-medium text-[#51436d]">{active ? <LoaderCircle size={18} className="motion-safe:animate-spin"/> : stage === 'Completed' ? <Check size={18}/> : null}{stage}</span>
      {measured && <span className="text-sm tabular-nums text-[#78668f]">{Math.round(percent)}%</span>}
    </div>
    {active && <progress aria-label={`${stage} progress`} value={measured ? percent! : undefined} max={100} className="mt-4 h-1.5 w-full accent-[#8270d7]"/>}
    {detail && <p className="mt-2 text-sm text-[#82768f]">{detail}</p>}
    {index >= 0 && <ol aria-label="Processing stages" className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">{steps.map((label, i) => <li key={label} aria-current={i === index ? 'step' : undefined} className={i <= index ? 'font-medium text-[#7761ac]' : 'text-[#aaa0b7]'}>{label}</li>)}</ol>}
  </div>
}
