import { createApiClient } from "~/lib/backend/client"
import { getAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const category = url.searchParams.get("category") ?? undefined
  const auth = await getAuthContext(request)
  const api = createApiClient(auth?.token ?? null)
  return api.getSubjects(category)
}
