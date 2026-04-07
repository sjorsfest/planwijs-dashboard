import { getBookDetail } from "~/lib/api"
import { getAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/api.book"

export async function loader({ request, params }: Route.LoaderArgs) {
  const auth = await getAuthContext(request)
  return getBookDetail(auth?.token ?? null, params.id)
}
