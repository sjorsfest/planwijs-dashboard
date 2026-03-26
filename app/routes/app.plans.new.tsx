import { redirect } from "react-router"
import type { Route } from "./+types/app.plans.new"

export async function loader(_: Route.LoaderArgs) {
  return redirect("/lesplan/new")
}

export default function LegacyNewPlanRedirect() {
  return null
}
