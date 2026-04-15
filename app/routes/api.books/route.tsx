import { createApiClient } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

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
    const yearOk =
      !year ||
      (book.school_years ?? []).length === 0 ||
      (book.school_years ?? []).includes(year) ||
      (book.school_years ?? []).includes("Unknown")
    const bookLevels = book.levels ?? []
    const levelOk =
      !level ||
      bookLevels.length === 0 ||
      bookLevels.includes(level) ||
      bookLevels.includes("Unknown") ||
      (level === "Gymnasium" && bookLevels.includes("VWO"))
    return yearOk && levelOk
  })
}
