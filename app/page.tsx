import ZoClipApp from '@/components/zoclip-app'

export default function Page() {
  return <ZoClipApp />
}

// Backend integration note: this frontend is intentionally isolated from the unavailable
// Python repository in this workspace. API contracts can be wired through typed server
// actions once the FastAPI routes are mounted alongside the Vercel deployment.
// 
