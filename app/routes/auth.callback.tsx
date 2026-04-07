import { redirect } from "react-router"
import type { Route } from "./+types/auth.callback"
import { createUserSession } from "~/lib/auth.server"

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const token = url.searchParams.get("access_token")

  if (!token) {
    return redirect("/login")
  }

  return createUserSession(token, "/dashboard")
}

// This page is never rendered — the loader always redirects.
export default function AuthCallback() {
  return null
}
