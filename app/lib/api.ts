import type { components } from "~/types/api.generated"

export type Event = components["schemas"]["Event"]
export type User = components["schemas"]["User"]
export type Method = components["schemas"]["Method"]
export type Class = components["schemas"]["Class"]
export type Chapter = components["schemas"]["ChapterResponse"]
export type Paragraph = components["schemas"]["ParagraphResponse"]
export type SchoolYear = components["schemas"]["SchoolYear"]
export type Level = components["schemas"]["Level"]
export type LesplanStatus = components["schemas"]["LesplanStatus"]
export type FeedbackMessageResponse = components["schemas"]["FeedbackMessageResponse"]
export type LessonPlanResponse = components["schemas"]["LessonPlanResponse"]
export type LesplanOverviewResponse = components["schemas"]["LesplanOverviewResponse"]
export type LesplanResponse = components["schemas"]["LesplanResponse"]
export type CreateLesplanRequest = components["schemas"]["CreateLesplanRequest"]
export type FeedbackRequest = components["schemas"]["FeedbackRequest"]
export type Subject = {
  id: string
  slug: string
  name: string
  category: string
  created_at?: string
  updated_at?: string
}

type BookOutput = components["schemas"]["Book-Output"]
type BookDetailOutput = components["schemas"]["BookDetailResponse"]

export type Book = Omit<BookOutput, "subject"> & {
  subject_id?: string | null
  subject_slug?: string | null
  subject_name?: string | null
  subject_category?: string | null
}

export type BookDetail = Omit<BookDetailOutput, "subject"> & {
  subject_id?: string | null
  subject_slug?: string | null
  subject_name?: string | null
  subject_category?: string | null
}

// Server-only — never imported directly in client components
const API_URL = process.env.API_URL || "http://localhost:8000"

export function getApiUrl(): string {
  return API_URL
}

/** Extract the access_token value from a Cookie header string. */
export function extractToken(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function authHeader(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export class ApiRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiRequestError"
    this.status = status
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data === "string") return data
    if (typeof data?.detail === "string") return data.detail
    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      const first = data.detail[0] as { msg?: unknown }
      if (typeof first?.msg === "string") return first.msg
    }
  } catch {
    // Ignore JSON parse failures and fall back to status text.
  }

  return res.statusText || "API request failed"
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new ApiRequestError(await parseErrorMessage(res), res.status)
  }
  return res.json()
}

export async function getEvents(token: string | null): Promise<Event[]> {
  try {
    const res = await fetch(`${API_URL}/events/`, {
      headers: { "Content-Type": "application/json", ...authHeader(token) },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function createEvent(
  data: { name: string; description?: string | null; planned_date: string },
  token: string | null
): Promise<Event | null> {
  try {
    const res = await fetch(`${API_URL}/events/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify(data),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getSubjects(token: string | null, category?: string): Promise<Subject[]> {
  try {
    const url = new URL(`${API_URL}/subjects/`)
    if (category) url.searchParams.set("category", category)

    const res = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json", ...authHeader(token) },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function getMethods(
  token: string | null,
  filters?: { subjectId?: string; subjectName?: string }
): Promise<Method[]> {
  try {
    const res = await fetch(`${API_URL}/methods/`, {
      headers: { "Content-Type": "application/json", ...authHeader(token) },
    })
    if (!res.ok) return []
    const all: Method[] = await res.json()
    if (!filters?.subjectId && !filters?.subjectName) return all

    return all.filter((method) => {
      const methodCandidate = method as unknown as {
        subject_id?: string | null
        subject?: string | { id?: string | null; name?: string | null } | null
      }

      if (filters.subjectId) {
        if (methodCandidate.subject_id === filters.subjectId) return true
        if (
          methodCandidate.subject &&
          typeof methodCandidate.subject === "object" &&
          methodCandidate.subject.id === filters.subjectId
        ) {
          return true
        }
      }

      if (filters.subjectName) {
        if (typeof methodCandidate.subject === "string" && methodCandidate.subject === filters.subjectName) {
          return true
        }
        if (
          methodCandidate.subject &&
          typeof methodCandidate.subject === "object" &&
          methodCandidate.subject.name === filters.subjectName
        ) {
          return true
        }
      }

      return false
    })
  } catch {
    return []
  }
}

export async function getBooks(
  token: string | null,
  filters?: { methodId?: string; subjectId?: string }
): Promise<Book[]> {
  try {
    const url = new URL(`${API_URL}/books/`)
    if (filters?.methodId) url.searchParams.set("method_id", filters.methodId)
    if (filters?.subjectId) url.searchParams.set("subject_id", filters.subjectId)

    const res = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json", ...authHeader(token) },
    })
    if (!res.ok) return []
    const all: Book[] = await res.json()
    if (!filters?.methodId && !filters?.subjectId) return all

    return all.filter((book) => {
      if (filters.methodId && book.method_id !== filters.methodId) return false
      if (filters.subjectId && book.subject_id !== filters.subjectId) return false
      return true
    })
  } catch {
    return []
  }
}

export async function getBookDetail(token: string | null, bookId: string): Promise<BookDetail | null> {
  try {
    const res = await fetch(`${API_URL}/books/${bookId}`, {
      headers: { "Content-Type": "application/json", ...authHeader(token) },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function deleteEvent(id: string, token: string | null): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/events/${id}`, {
      method: "DELETE",
      headers: authHeader(token),
    })
    return res.ok || res.status === 204
  } catch {
    return false
  }
}

export async function getMethod(token: string | null, methodId: string): Promise<Method | null> {
  try {
    const res = await fetch(`${API_URL}/methods/${methodId}`, {
      headers: { "Content-Type": "application/json", ...authHeader(token) },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function createClass(
  data: Omit<Class, "id" | "created_at" | "updated_at">,
  token: string | null
): Promise<Class> {
  return requestJson<Class>(`${API_URL}/classes/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify(data),
  })
}

export async function getClass(token: string | null, classId: string): Promise<Class | null> {
  try {
    const res = await fetch(`${API_URL}/classes/${classId}`, {
      headers: { "Content-Type": "application/json", ...authHeader(token) },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function createLesplan(data: CreateLesplanRequest, token: string | null): Promise<LesplanResponse> {
  return requestJson<LesplanResponse>(`${API_URL}/lesplan/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify(data),
  })
}

export async function getLesplan(token: string | null, requestId: string): Promise<LesplanResponse | null> {
  try {
    const res = await fetch(`${API_URL}/lesplan/${requestId}`, {
      headers: { "Content-Type": "application/json", ...authHeader(token) },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function listLespannen(token: string | null, userId: string): Promise<LesplanResponse[]> {
  try {
    const url = new URL(`${API_URL}/lesplan/`)
    url.searchParams.set("user_id", userId)
    const res = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json", ...authHeader(token) },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function submitFeedback(
  token: string | null,
  requestId: string,
  data: FeedbackRequest
): Promise<LesplanResponse> {
  return requestJson<LesplanResponse>(`${API_URL}/lesplan/${requestId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify(data),
  })
}

export async function approveLesplan(token: string | null, requestId: string): Promise<LesplanResponse> {
  return requestJson<LesplanResponse>(`${API_URL}/lesplan/${requestId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
  })
}
