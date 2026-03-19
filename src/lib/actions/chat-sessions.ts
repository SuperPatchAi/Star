'use server'

import { createClient } from '@/lib/supabase/server'
import type { ChatSession, ChatSessionUpdate, Json } from '@/lib/db/types'

export async function getChatSessions(): Promise<ChatSession[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('d2c_chat_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('getChatSessions error:', error)
    return []
  }

  return (data ?? []) as ChatSession[]
}

export async function getChatSession(sessionId: string): Promise<ChatSession | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('d2c_chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (error) return null
  return data as ChatSession
}

export async function upsertChatSession(
  sessionId: string,
  title: string,
  messages: Json,
): Promise<ChatSession | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('d2c_chat_sessions')
    .upsert(
      {
        id: sessionId,
        user_id: user.id,
        title,
        messages,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select()
    .single()

  if (error) {
    console.error('upsertChatSession error:', error)
    return null
  }

  return data as ChatSession
}

export async function updateChatSession(
  sessionId: string,
  updates: ChatSessionUpdate,
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('d2c_chat_sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', user.id)
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('d2c_chat_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id)
}
