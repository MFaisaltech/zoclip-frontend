import { AuthApiError } from './auth-api'

const hosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'])

// This is input feedback, never a substitute for server-side validation.
export function canonicalYouTubeUrl(value: string): string {
  const text = value.replace(/^ +| +$/g, '')
  try {
    if (text.length > 2048 || Array.from(text).some(c => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127 || c === '\\')) throw Error('url')
    const url = new URL(text)
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw Error('url')
    let id = ''
    if (hosts.has(url.hostname.toLowerCase())) {
      if (url.pathname === '/watch') id = url.searchParams.get('v') ?? ''
      else {
        const parts = url.pathname.split('/').filter(Boolean)
        if (parts.length === 2 && ['shorts', 'live', 'embed'].includes(parts[0])) id = parts[1]
      }
    } else if (url.hostname.toLowerCase() === 'youtu.be') {
      const parts = url.pathname.split('/').filter(Boolean)
      if (parts.length === 1) id = parts[0]
    }
    if (id.length !== 11 || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw Error('video')
    return `https://www.youtube.com/watch?v=${id}`
  } catch { throw new AuthApiError(422, 'unsupported_youtube_url') }
}
