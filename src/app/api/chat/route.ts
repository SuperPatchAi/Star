import { createClient } from '@/lib/supabase/server'

const AGENT_URL = process.env.STAR_AGENT_URL

export async function POST(req: Request) {
  if (!AGENT_URL) {
    return new Response(
      JSON.stringify({ error: 'STAR_AGENT_URL is not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const body = await req.json()

  const upstream = await fetch(`${AGENT_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })

  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => 'Unknown error')
    return new Response(
      JSON.stringify({ error: errorText }),
      { status: upstream.status, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!upstream.body) {
    return new Response(
      JSON.stringify({ error: 'No response body from agent' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
