export { default } from "./page"

import type { Route } from "./+types/route"
import { logout } from "~/lib/auth.server"

export async function loader({ request }: Route.LoaderArgs) {
  return logout(request)
}
