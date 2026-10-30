import { AuthApiError } from './auth-api'
import { mediaApi, type MediaSchemas } from './media-api'
import { workspaceApi } from './workspace-api'

export type GenerationQuote = {quote: MediaSchemas['QuoteView']; key: string; confirmed: boolean}

export async function quoteForVideo(videoId: string, count: number, signal: AbortSignal,
  api = mediaApi, readWallet = () => workspaceApi.read('wallet', undefined, signal)) {
  const [source, wallet, billing] = await Promise.all([
    api.call('video', {params: {video_id: videoId}, signal}), readWallet(), api.call('billingOverview', {signal}),
  ])
  const duration = source.metadata_json.duration_seconds
  if (source.state !== 'READY' || typeof duration !== 'number' || !Number.isSafeInteger(duration) || duration < 1)
    throw new AuthApiError(409, 'source_not_ready')
  if (!Number.isInteger(count) || count < 1 || count > Math.min(3, billing.plan?.price?.rules.max_outputs ?? 3))
    throw new AuthApiError(422, 'plan_limit')
  const body = {source_seconds: duration, output_count: count, edit_count: 0, captions: true, reframe: true}
  // Quotes do not reserve or settle credits. The server rechecks all rules on confirm.
  const quote = await api.call('quote', {body, key: crypto.randomUUID(), signal})
  return {quote, balance: wallet.available_credits}
}

export async function confirmGeneration(videoId: string, request: GenerationQuote, signal: AbortSignal,
  api = mediaApi, readWallet = () => workspaceApi.read('wallet', undefined, signal)) {
  if (!request.confirmed) {
    if (Date.parse(request.quote.expires_at) <= Date.now()) throw new AuthApiError(409, 'quote_expired')
    const wallet = await readWallet()
    if (wallet.available_credits < request.quote.credits) throw new AuthApiError(409, 'insufficient_credits')
  }
  return api.call('generate', {params: {video_id: videoId},
    body: {quote_id: request.quote.id, auto_render: true}, key: request.key, signal})
}
