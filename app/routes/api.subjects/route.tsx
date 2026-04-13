import { createApiClient } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const category = url.searchParams.get("category") ?? undefined
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  return api.getSubjects(category)
}
