import ZoClipApp from '@/components/zoclip-app'

// No administrative data is server-rendered. The existing session bootstrap gates
// the page, and every data read/mutation independently requires backend AdminUser.
export default function AdminPage() {
  return <ZoClipApp initialSection="Admin" />
}
