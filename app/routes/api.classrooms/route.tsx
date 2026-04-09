import { data } from "react-router"
import { createApiClient } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  return api.getClassrooms()
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 })
  }

  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const body = await request.json()

  return api.createClassroom({
    name: body.name,
    description: body.description ?? null,
    assets: body.assets ?? [],
  })
}
