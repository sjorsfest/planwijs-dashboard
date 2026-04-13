import { createApiClient } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const subjectId = url.searchParams.get("subject_id") ?? undefined
  const subjectName = url.searchParams.get("subject_name") ?? url.searchParams.get("subject") ?? undefined
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const methods = await api.getMethods({ subjectId, subjectName })
  return methods
}
