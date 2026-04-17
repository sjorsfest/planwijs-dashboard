export { default } from "./page"

import { data } from "react-router"
import { createApiClient, ApiRequestError } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"
import type { SettingsLoaderData, SettingsActionData } from "./types"

export function meta() {
  return [{ title: "Instellingen | Leslab" }]
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)

  const [schoolConfig, userSubjects, allSubjects] = await Promise.all([
    api.getSchoolConfig(),
    api.getUserSubjects(),
    api.getSubjects(),
  ])

  return data<SettingsLoaderData>(
    { schoolConfig, userSubjects, allSubjects },
    { headers: { "Cache-Control": "private, max-age=10" } },
  )
}

export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const formData = await request.formData()
  const intent = formData.get("_action")

  try {
    if (intent === "updateConfig") {
      const body = JSON.parse(formData.get("body") as string)
      await api.updateSchoolConfig(body)
      return data<SettingsActionData>({ ok: true })
    }

    if (intent === "updateSubjects") {
      const subjectIds: string[] = JSON.parse(formData.get("subjectIds") as string)
      await api.updateUserSubjects(subjectIds)
      return data<SettingsActionData>({ ok: true })
    }

    if (intent === "updateAll") {
      const configBody = JSON.parse(formData.get("configBody") as string)
      const subjectIds: string[] = JSON.parse(formData.get("subjectIds") as string)
      await Promise.all([
        api.updateSchoolConfig(configBody),
        api.updateUserSubjects(subjectIds),
      ])
      return data<SettingsActionData>({ ok: true })
    }

    return data<SettingsActionData>({ ok: false, error: "Onbekende actie." }, { status: 400 })
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return data<SettingsActionData>({ ok: false, error: error.message }, { status: error.status })
    }
    return data<SettingsActionData>({ ok: false, error: "Er ging iets mis bij het opslaan." }, { status: 500 })
  }
}
