import type { Route } from "./+types/auth.logout"
import { logout } from "~/lib/auth.server"

export async function loader({ request }: Route.LoaderArgs) {
  return logout(request)
}

export default function AuthLogout() {
  return null
}
