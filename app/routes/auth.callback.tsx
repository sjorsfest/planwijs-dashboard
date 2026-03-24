import { redirect } from "react-router"
import type { Route } from "./+types/auth.callback"

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const token = url.searchParams.get("access_token")

  if (!token) {
    return redirect("/login")
  }

  // Store the token in an HttpOnly cookie so server-side loaders can read it.
  // SameSite=Lax protects against CSRF while still allowing the redirect from
  // the OAuth provider to land correctly.
  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": `access_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    },
  })
}

// This page is never rendered — the loader always redirects.
export default function AuthCallback() {
  return null
}
