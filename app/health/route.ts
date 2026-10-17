export const dynamic = 'force-static'

// Frontend-only liveness. The browser reaches the private API directly, never via Vercel.
export function GET() {
  return Response.json({status: 'alive'}, {headers: {'Cache-Control': 'no-store'}})
}
