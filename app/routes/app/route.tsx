export { default } from "./page"

import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export async function loader({ request }: Route.LoaderArgs) {
  await requireAuthContext(request)
  return null
}
