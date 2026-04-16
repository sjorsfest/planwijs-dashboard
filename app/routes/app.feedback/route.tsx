import { data } from "react-router"
import { createApiClient } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"
import type { Feedback, Comment } from "./types"

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)

  const feedbackList = (await api.listTestFeedback()) as Feedback[]

  return data({ feedbackList })
}

export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const formData = await request.formData()
  const intent = formData.get("intent") as string

  if (intent === "create") {
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const type = formData.get("type") as "BUG" | "SUGGESTION" | "OTHER"
    const route = formData.get("route") as string

    if (!name || !description || !type) {
      return data({ error: "Vul alle velden in" }, { status: 400 })
    }

    const created = (await api.createTestFeedback({
      route: route || "/",
      name,
      description,
      type,
    })) as Feedback

    return data({ created })
  }

  if (intent === "vote") {
    const feedbackId = formData.get("feedbackId") as string
    const result = await api.toggleTestFeedbackVote(feedbackId)
    return data({ vote: result })
  }

  if (intent === "comment") {
    const feedbackId = formData.get("feedbackId") as string
    const text = formData.get("text") as string
    if (!text) return data({ error: "Typ een reactie" }, { status: 400 })
    const comment = (await api.createTestFeedbackComment(feedbackId, text)) as Comment
    return data({ comment })
  }

  if (intent === "delete") {
    const feedbackId = formData.get("feedbackId") as string
    await api.deleteTestFeedback(feedbackId)
    return data({ deleted: true })
  }

  if (intent === "deleteComment") {
    const commentId = formData.get("commentId") as string
    await api.deleteTestFeedbackComment(commentId)
    return data({ deletedComment: true })
  }

  if (intent === "loadComments") {
    const feedbackId = formData.get("feedbackId") as string
    const comments = (await api.listTestFeedbackComments(feedbackId)) as Comment[]
    return data({ comments })
  }

  return data({ error: "Onbekende actie" }, { status: 400 })
}
