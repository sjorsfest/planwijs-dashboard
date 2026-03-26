import { getSubjects, extractToken } from "~/lib/api"
import type { Route } from "./+types/api.subjects"

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const category = url.searchParams.get("category") ?? undefined
  const token = extractToken(request.headers.get("Cookie") || "")
  return getSubjects(token, category)
}
