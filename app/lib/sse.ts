type JsonValue = Record<string, unknown>

type EventSourceOptions<TStatus, TPartial, TDone> = {
  url: string
  onStatus?: (payload: TStatus) => void
  onPartial?: (payload: TPartial) => void
  onDone?: (payload: TDone) => void
  onError?: (message: string, kind: "event" | "transport") => void
}

function parseJson<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

function extractMessage(value: JsonValue | null): string {
  const message = value?.message
  return typeof message === "string" && message.length > 0 ? message : "De streamverbinding is verbroken."
}

export function openEventSource<TStatus = JsonValue, TPartial = JsonValue, TDone = JsonValue>({
  url,
  onStatus,
  onPartial,
  onDone,
  onError,
}: EventSourceOptions<TStatus, TPartial, TDone>): () => void {
  const source = new EventSource(url)

  source.addEventListener("status", (event) => {
    const payload = parseJson<TStatus>((event as MessageEvent).data)
    if (payload) onStatus?.(payload)
  })

  source.addEventListener("partial", (event) => {
    const payload = parseJson<TPartial>((event as MessageEvent).data)
    if (payload) onPartial?.(payload)
  })

  source.addEventListener("done", (event) => {
    const payload = parseJson<TDone>((event as MessageEvent).data)
    if (payload) onDone?.(payload)
    source.close()
  })

  source.addEventListener("error", (event) => {
    const payload = parseJson<JsonValue>((event as MessageEvent).data)
    onError?.(extractMessage(payload), "event")
    source.close()
  })

  source.onerror = () => {
    onError?.("De verbinding met het lesplan is onderbroken.", "transport")
    source.close()
  }

  return () => source.close()
}
