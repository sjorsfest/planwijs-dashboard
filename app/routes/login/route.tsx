export { default } from "./page"

import { redirect } from "react-router"
import { getApiUrl } from "~/lib/backend/client"
import { getAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Inloggen | Leslab" },
    { name: "description", content: "Log in op Leslab om je lesplannen te beheren." },
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  const auth = await getAuthContext(request)
  if (auth) throw redirect("/dashboard")

  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/auth/callback`
  return { apiUrl: getApiUrl(), redirectUri }
}
