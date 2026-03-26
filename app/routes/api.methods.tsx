import { getMethods, extractToken } from "~/lib/api"
import type { Route } from "./+types/api.methods"

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const subjectId = url.searchParams.get("subject_id") ?? undefined
  const subjectName = url.searchParams.get("subject_name") ?? url.searchParams.get("subject") ?? undefined
  const token = extractToken(request.headers.get("Cookie") || "")
  const methods = await getMethods(token, { subjectId, subjectName })
  return methods
}
