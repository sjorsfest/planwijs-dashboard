export { default } from "./page"

import { getApiUrl } from "~/lib/backend/client"
import type { Route } from "./+types/route"

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Inloggen — Planwijs" },
    { name: "description", content: "Log in op Planwijs om je lesplannen te beheren." },
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/auth/callback`
  return { apiUrl: getApiUrl(), redirectUri }
}
