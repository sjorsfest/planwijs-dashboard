import { createApiClient } from "~/lib/backend/client"
import { getAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export async function loader({ request, params }: Route.LoaderArgs) {
  const auth = await getAuthContext(request)
  const api = createApiClient(auth?.token ?? null)
  return api.getBookDetail(params.id)
}
