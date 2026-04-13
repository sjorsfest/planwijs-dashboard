import { createApiClient } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const methodId = url.searchParams.get("method_id") ?? undefined
  const subjectId = url.searchParams.get("subject_id") ?? undefined
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  return api.getBooks({ methodId, subjectId })
}
