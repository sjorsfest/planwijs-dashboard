import { getBooks, extractToken } from "~/lib/api"
import type { Route } from "./+types/api.books"

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const methodId = url.searchParams.get("method_id") ?? undefined
  const subjectId = url.searchParams.get("subject_id") ?? undefined
  const token = extractToken(request.headers.get("Cookie") || "")
  return getBooks(token, { methodId, subjectId })
}
