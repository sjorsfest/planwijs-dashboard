export { default } from "./page"

import { data } from "react-router"
import { listLespannen } from "~/lib/api"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export function meta() {
  return [{ title: "Plannen — Planwijs" }]
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const lespannen = await listLespannen(token)
  return data({ lespannen }, { headers: { "Cache-Control": "private, max-age=10" } })
}
