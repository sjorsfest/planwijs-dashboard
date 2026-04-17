export { default } from "./page"

import { data } from "react-router"
import { requireAuthContext } from "~/lib/auth.server"
import { createApiClient } from "~/lib/backend/client"
import type { Route } from "./+types/route"

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const [lespannen, schoolConfig, user] = await Promise.all([
    api.listLespannen(),
    api.getSchoolConfig(),
    api.getMe(),
  ])
  const hasLesplans = lespannen.some((lp) => lp.overview !== null)
  const hasSchoolConfig = schoolConfig !== null
  return data({
    hasLesplans,
    hasSchoolConfig,
    userName: user.name,
  })
}
