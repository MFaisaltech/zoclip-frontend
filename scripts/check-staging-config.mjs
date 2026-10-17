import {pathToFileURL} from 'node:url'

export function validateStagingConfig(env) {
  if (env.NEXT_PUBLIC_PRIVATE_STAGING !== 'true') throw Error('Private staging must be explicitly enabled')
  if (env.NEXT_PUBLIC_ENABLE_REGISTRATION !== 'false' || env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'false')
    throw Error('Private staging requires registration and analytics disabled')
  const domain = env.NEXT_PUBLIC_STAGING_SITE_DOMAIN ?? ''
  const dns = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/
  if (!dns.test(domain) || ['vercel.app', 'localhost'].includes(domain))
    throw Error('An explicitly owned staging site domain is required')
  const origins = [env.NEXT_PUBLIC_APP_ORIGIN, env.NEXT_PUBLIC_API_ORIGIN].map(value => {
    const url = new URL(value ?? '')
    if (value !== url.origin) throw Error('Canonical exact HTTPS origins are required')
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/')
      throw Error('Exact HTTPS browser origins are required')
    if (url.hostname !== domain && !url.hostname.endsWith('.' + domain))
      throw Error('Frontend and API must belong to the same owned staging site')
    if (!dns.test(url.hostname)) throw Error('Exact valid DNS hostnames required')
    return url.origin
  })
  if (new URL(origins[0]).hostname === new URL(origins[1]).hostname)
    throw Error('Separate frontend/API subdomains required for host-only cookies')
  return {appOrigin: origins[0], apiOrigin: origins[1]}
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateStagingConfig(process.env)
  console.log('Private staging browser configuration valid; integrations remain disabled')
}
