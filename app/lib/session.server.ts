import { createCookieSessionStorage } from "react-router"

const sessionSecret = process.env.SESSION_SECRET ?? "dev-session-secret"

const storage = createCookieSessionStorage({
  cookie: {
    name: "leslab_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 24 hours
  },
})

export const { getSession, commitSession, destroySession } = storage

// ─── Active task helpers ──────────────────────────────────────────────────
// Store/retrieve the currently running background task for a given lesplan.

type StoredTask = {
  taskId: string
  taskType: "generate_overview" | "apply_feedback" | "generate_lessons" | "apply_lesson_feedback"
}

function taskKey(resourceId: string) {
  return `task:${resourceId}`
}

export function setActiveTask(
  session: Awaited<ReturnType<typeof getSession>>,
  resourceId: string,
  taskId: string,
  taskType: StoredTask["taskType"],
) {
  session.set(taskKey(resourceId), JSON.stringify({ taskId, taskType }))
}

export function getActiveTask(
  session: Awaited<ReturnType<typeof getSession>>,
  resourceId: string,
): StoredTask | null {
  const raw = session.get(taskKey(resourceId)) as string | undefined
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredTask
  } catch {
    return null
  }
}

export function clearActiveTask(
  session: Awaited<ReturnType<typeof getSession>>,
  resourceId: string,
) {
  session.unset(taskKey(resourceId))
}
