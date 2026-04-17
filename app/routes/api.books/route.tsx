import { createApiClient } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

/** Type-safe `.includes()` that accepts a wider search value */
function includes<T>(arr: readonly T[], value: unknown): value is T {
  return (arr as readonly unknown[]).includes(value)
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const methodId = url.searchParams.get("method_id") ?? undefined
  const subjectId = url.searchParams.get("subject_id") ?? undefined
  const level = url.searchParams.get("level") ?? undefined
  const year = url.searchParams.get("year") ?? undefined
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const books = await api.getBooks({ methodId, subjectId })

  return books.filter((book) => {
    const schoolYears = book.school_years ?? []
    const yearOk =
      !year ||
      schoolYears.length === 0 ||
      includes(schoolYears, year) ||
      includes(schoolYears, "Unknown")
    const bookLevels = book.levels ?? []
    const levelOk =
      !level ||
      bookLevels.length === 0 ||
      includes(bookLevels, level) ||
      includes(bookLevels, "Unknown") ||
      (level === "Gymnasium" && includes(bookLevels, "Vwo"))
    return yearOk && levelOk
  })
}
