import type { ChatTransport, UIMessage, UIMessageChunk, ChatRequestOptions } from 'ai'

type SendMessagesOptions = {
  trigger: 'submit-message' | 'regenerate-message'
  chatId: string
  messageId: string | undefined
  messages: UIMessage[]
  abortSignal: AbortSignal | undefined
} & ChatRequestOptions

/**
 * Custom transport that bridges the AI SDK v6 chat protocol
 * with our FastAPI backend's custom SSE format.
 */
export class StarAgentTransport implements ChatTransport<UIMessage> {
  async sendMessages({
    messages,
    body,
    abortSignal,
  }: SendMessagesOptions): Promise<ReadableStream<UIMessageChunk>> {
    const simpleMessages = messages.map((m) => ({
      role: m.role,
      content:
        m.parts
          ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join('') || '',
    }))

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: simpleMessages, ...(body ?? {}) }),
      signal: abortSignal ?? undefined,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => 'Request failed')
      throw new Error(text)
    }

    if (!response.body) {
      throw new Error('No response body from server')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        controller.enqueue({ type: 'start' })
        controller.enqueue({ type: 'start-step' })

        let buffer = ''
        let textPartId = crypto.randomUUID()
        let textStarted = false
        const toolCallIds = new Map<string, string>()

        try {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              let data: Record<string, unknown>
              try {
                data = JSON.parse(line.slice(6))
              } catch {
                continue
              }

              switch (data.type) {
                case 'text_delta': {
                  if (!textStarted) {
                    controller.enqueue({ type: 'text-start', id: textPartId })
                    textStarted = true
                  }
                  controller.enqueue({
                    type: 'text-delta',
                    id: textPartId,
                    delta: data.content as string,
                  })
                  break
                }

                case 'tool_call': {
                  if (textStarted) {
                    controller.enqueue({ type: 'text-end', id: textPartId })
                    textStarted = false
                    textPartId = crypto.randomUUID()
                  }
                  const toolName = data.tool as string
                  const backendCallId = data.call_id as string | undefined
                  const callId = backendCallId || crypto.randomUUID()
                  toolCallIds.set(backendCallId || toolName, callId)
                  controller.enqueue({
                    type: 'tool-input-available',
                    toolCallId: callId,
                    toolName,
                    input: data.input ?? {},
                    dynamic: true,
                  })
                  break
                }

                case 'tool_result': {
                  const backendCallId = data.call_id as string | undefined
                  const toolName = data.tool as string
                  const callId = toolCallIds.get(backendCallId || toolName) ?? crypto.randomUUID()
                  controller.enqueue({
                    type: 'tool-output-available',
                    toolCallId: callId,
                    output: data.output ?? '',
                    dynamic: true,
                  })
                  break
                }

                case 'error':
                case 'rate_limited':
                case 'service_unavailable': {
                  controller.enqueue({
                    type: 'error',
                    errorText: (data.message as string) ?? 'An error occurred',
                  })
                  break
                }

                case 'done': {
                  if (textStarted) {
                    controller.enqueue({ type: 'text-end', id: textPartId })
                    textStarted = false
                    textPartId = crypto.randomUUID()
                  }
                  break
                }
              }
            }
          }

          if (textStarted) {
            controller.enqueue({ type: 'text-end', id: textPartId })
          }
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            controller.enqueue({
              type: 'error',
              errorText: (err as Error).message ?? 'Stream interrupted',
            })
          }
        }

        controller.enqueue({ type: 'finish-step' })
        controller.enqueue({ type: 'finish' })
        controller.close()
      },
    })
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null
  }
}
