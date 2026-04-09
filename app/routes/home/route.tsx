export { default } from "./page"

import { redirect } from "react-router"
import type { Route } from "./+types/route"

export async function loader(_: Route.LoaderArgs) {
  return redirect("/login")
}
