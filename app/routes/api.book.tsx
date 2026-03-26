import { getBookDetail, extractToken } from "~/lib/api"
import type { Route } from "./+types/api.book"

export async function loader({ request, params }: Route.LoaderArgs) {
  const token = extractToken(request.headers.get("Cookie") || "")
  return getBookDetail(token, params.id)
}
