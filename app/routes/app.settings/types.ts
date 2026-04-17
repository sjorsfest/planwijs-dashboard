import type { SchoolConfigResponse, Subject, UserSubject } from "~/lib/backend/types"

export type SettingsLoaderData = {
  schoolConfig: SchoolConfigResponse | null
  userSubjects: UserSubject[]
  allSubjects: Subject[]
}

export type SettingsActionData = {
  ok: boolean
  error?: string
}
