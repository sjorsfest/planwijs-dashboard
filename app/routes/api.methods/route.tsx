import { getMethods } from "~/lib/api"
import { getAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const subjectId = url.searchParams.get("subject_id") ?? undefined
  const subjectName = url.searchParams.get("subject_name") ?? url.searchParams.get("subject") ?? undefined
  const auth = await getAuthContext(request)
  const methods = await getMethods(auth?.token ?? null, { subjectId, subjectName })
  return methods
}
