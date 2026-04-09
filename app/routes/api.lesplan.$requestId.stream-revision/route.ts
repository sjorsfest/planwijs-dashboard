import { getApiUrl } from "~/lib/api"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

function buildProxyHeaders(source: Headers): Headers {
  const headers = new Headers()
  const contentType = source.get("content-type")
  if (contentType) headers.set("Content-Type", contentType)
  headers.set("Cache-Control", source.get("cache-control") ?? "no-cache")
  headers.set("X-Accel-Buffering", source.get("x-accel-buffering") ?? "no")
  return headers
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)

  const upstream = await fetch(`${getApiUrl()}/lesplan/${params.requestId}/stream-revision`, {
    headers: {
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
    },
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: buildProxyHeaders(upstream.headers),
  })
}
