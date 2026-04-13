import type {
  Book,
  BookDetail,
  CalendarResponse,
  Class,
  Classroom,
  ClassroomCreate,
  CreateLesplanRequest,
  FeedbackRequest,
  FileRecord,
  FileUploadUrlRequest,
  FileUploadUrlResponse,
  Folder,
  LesplanResponse,
  LessonPlanResponse,
  LessonPreparationTodoResponse,
  Method,
  Subject,
  TaskSubmittedResponse,
  TaskStatusResponse,
  UpdateLessonPreparationTodoRequest,
} from "./types"

const API_URL = process.env.API_URL || "http://localhost:8000"

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

class ApiClient {
  private token: string | null

  constructor(token: string | null) {
    this.token = token
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" }
    if (this.token) h["Authorization"] = `Bearer ${this.token}`
    return h
  }

  private async requestJson<T>(url: string, init: RequestInit): Promise<T> {
    const res = await fetch(url, init)
    if (!res.ok) {
      throw new ApiRequestError(await parseErrorMessage(res), res.status)
    }
    return res.json()
  }

  // ─── Classrooms ───────────────────────────────────────────────────────

  async getClassrooms(): Promise<Classroom[]> {
    try {
      const res = await fetch(`${API_URL}/classrooms/`, { headers: this.headers })
      if (!res.ok) return []
      return res.json()
    } catch {
      return []
    }
  }

  async getClassroom(classroomId: string): Promise<Classroom | null> {
    try {
      const res = await fetch(`${API_URL}/classrooms/${classroomId}`, { headers: this.headers })
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  }

  async createClassroom(data: ClassroomCreate): Promise<Classroom> {
    return this.requestJson<Classroom>(`${API_URL}/classrooms/`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(data),
    })
  }

  async updateClassroom(
    classroomId: string,
    data: Partial<Omit<Classroom, "id" | "created_at" | "updated_at" | "user_id">>,
  ): Promise<Classroom> {
    return this.requestJson<Classroom>(`${API_URL}/classrooms/${classroomId}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(data),
    })
  }

  async deleteClassroom(classroomId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/classrooms/${classroomId}`, {
        method: "DELETE",
        headers: this.headers,
      })
      return res.ok || res.status === 204
    } catch {
      return false
    }
  }

  // ─── Subjects / Methods / Books ───────────────────────────────────────

  async getSubjects(category?: string): Promise<Subject[]> {
    try {
      const url = new URL(`${API_URL}/subjects/`)
      if (category) url.searchParams.set("category", category)
      const res = await fetch(url.toString(), { headers: this.headers })
      if (!res.ok) return []
      return res.json()
    } catch {
      return []
    }
  }

  async getMethods(filters?: { subjectId?: string; subjectName?: string }): Promise<Method[]> {
    try {
      const res = await fetch(`${API_URL}/methods/`, { headers: this.headers })
      if (!res.ok) return []
      const all: Method[] = await res.json()
      if (!filters?.subjectId && !filters?.subjectName) return all

      return all.filter((method) => {
        const candidate = method as unknown as {
          subject_id?: string | null
          subject?: string | { id?: string | null; name?: string | null } | null
        }

        if (filters.subjectId) {
          if (candidate.subject_id === filters.subjectId) return true
          if (
            candidate.subject &&
            typeof candidate.subject === "object" &&
            candidate.subject.id === filters.subjectId
          ) return true
        }

        if (filters.subjectName) {
          if (typeof candidate.subject === "string" && candidate.subject === filters.subjectName) return true
          if (
            candidate.subject &&
            typeof candidate.subject === "object" &&
            candidate.subject.name === filters.subjectName
          ) return true
        }

        return false
      })
    } catch {
      return []
    }
  }

  async getMethod(methodId: string): Promise<Method | null> {
    try {
      const res = await fetch(`${API_URL}/methods/${methodId}`, { headers: this.headers })
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  }

  async getBooks(filters?: { methodId?: string; subjectId?: string }): Promise<Book[]> {
    try {
      const url = new URL(`${API_URL}/books/`)
      if (filters?.methodId) url.searchParams.set("method_id", filters.methodId)
      if (filters?.subjectId) url.searchParams.set("subject_id", filters.subjectId)

      const res = await fetch(url.toString(), { headers: this.headers })
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

  async getBookDetail(bookId: string): Promise<BookDetail | null> {
    try {
      const res = await fetch(`${API_URL}/books/${bookId}`, { headers: this.headers })
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  }

  // ─── Classes ──────────────────────────────────────────────────────────

  async createClass(data: Omit<Class, "id" | "created_at" | "updated_at" | "user_id">): Promise<Class> {
    return this.requestJson<Class>(`${API_URL}/classes/`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(data),
    })
  }

  async getClasses(): Promise<Class[]> {
    try {
      const res = await fetch(`${API_URL}/classes/`, { headers: this.headers })
      if (!res.ok) return []
      return res.json()
    } catch {
      return []
    }
  }

  async getClass(classId: string): Promise<Class | null> {
    try {
      const res = await fetch(`${API_URL}/classes/${classId}`, { headers: this.headers })
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  }

  async updateClass(
    classId: string,
    data: Partial<Omit<Class, "id" | "created_at" | "updated_at">>,
  ): Promise<Class> {
    return this.requestJson<Class>(`${API_URL}/classes/${classId}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(data),
    })
  }

  async deleteClass(classId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/classes/${classId}`, {
        method: "DELETE",
        headers: this.headers,
      })
      return res.ok || res.status === 204
    } catch {
      return false
    }
  }

  // ─── Lesplannen ───────────────────────────────────────────────────────

  async createLesplan(data: Omit<CreateLesplanRequest, "user_id">): Promise<LesplanResponse> {
    return this.requestJson<LesplanResponse>(`${API_URL}/lesplan/`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(data),
    })
  }

  async getLesplan(requestId: string): Promise<LesplanResponse | null> {
    try {
      const res = await fetch(`${API_URL}/lesplan/${requestId}`, { headers: this.headers })
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  }

  async listLespannen(): Promise<LesplanResponse[]> {
    try {
      const res = await fetch(`${API_URL}/lesplan/`, { headers: this.headers })
      if (!res.ok) return []
      return res.json()
    } catch {
      return []
    }
  }

  async generateOverview(requestId: string): Promise<TaskSubmittedResponse> {
    return this.requestJson<TaskSubmittedResponse>(`${API_URL}/lesplan/${requestId}/generate-overview`, {
      method: "POST",
      headers: this.headers,
    })
  }

  async submitFeedback(requestId: string, data: FeedbackRequest): Promise<TaskSubmittedResponse> {
    return this.requestJson<TaskSubmittedResponse>(`${API_URL}/lesplan/${requestId}/feedback`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(data),
    })
  }

  async approveLesplan(requestId: string): Promise<TaskSubmittedResponse> {
    return this.requestJson<TaskSubmittedResponse>(`${API_URL}/lesplan/${requestId}/approve`, {
      method: "POST",
      headers: this.headers,
    })
  }

  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    return this.requestJson<TaskStatusResponse>(`${API_URL}/tasks/${taskId}`, {
      headers: this.headers,
    })
  }

  // ─── Calendar ─────────────────────────────────────────────────────────

  async getCalendarItems(startDate: string, endDate: string): Promise<CalendarResponse> {
    try {
      const url = new URL(`${API_URL}/calendar/`)
      url.searchParams.set("start_date", startDate)
      url.searchParams.set("end_date", endDate)

      const res = await fetch(url.toString(), { headers: this.headers })
      if (!res.ok) return { start_date: startDate, end_date: endDate, items: [] }
      return res.json()
    } catch {
      return { start_date: startDate, end_date: endDate, items: [] }
    }
  }

  // ─── Files ───────────────────────────────────────────────────────────

  async requestUploadUrl(data: FileUploadUrlRequest): Promise<FileUploadUrlResponse> {
    return this.requestJson<FileUploadUrlResponse>(`${API_URL}/files/upload-url`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(data),
    })
  }

  async listFiles(filters?: { folderId?: string; lesplanRequestId?: string }): Promise<FileRecord[]> {
    try {
      const url = new URL(`${API_URL}/files/`)
      if (filters?.folderId) url.searchParams.set("folder_id", filters.folderId)
      if (filters?.lesplanRequestId) url.searchParams.set("lesplan_request_id", filters.lesplanRequestId)
      const res = await fetch(url.toString(), { headers: this.headers })
      if (!res.ok) return []
      return res.json()
    } catch {
      return []
    }
  }

  async getFile(fileId: string): Promise<FileRecord | null> {
    try {
      const res = await fetch(`${API_URL}/files/${fileId}`, { headers: this.headers })
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  }

  async moveFile(fileId: string, folderId: string | null): Promise<FileRecord> {
    return this.requestJson<FileRecord>(`${API_URL}/files/${fileId}/move`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify({ folder_id: folderId }),
    })
  }

  async confirmUpload(fileId: string): Promise<FileRecord> {
    return this.requestJson<FileRecord>(`${API_URL}/files/${fileId}/confirm-upload`, {
      method: "POST",
      headers: this.headers,
    })
  }

  async uploadFailed(fileId: string): Promise<void> {
    await fetch(`${API_URL}/files/${fileId}/upload-failed`, {
      method: "POST",
      headers: this.headers,
    })
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/files/${fileId}`, {
        method: "DELETE",
        headers: this.headers,
      })
      return res.ok || res.status === 204
    } catch {
      return false
    }
  }

  // ─── Folders ────────────────────────────────────────────────────────

  async listFolders(): Promise<Folder[]> {
    try {
      const res = await fetch(`${API_URL}/folders/`, { headers: this.headers })
      if (!res.ok) return []
      return res.json()
    } catch {
      return []
    }
  }

  async getFolder(folderId: string): Promise<Folder | null> {
    try {
      const res = await fetch(`${API_URL}/folders/${folderId}`, { headers: this.headers })
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  }

  async createFolder(name: string, parentId: string | null): Promise<Folder> {
    return this.requestJson<Folder>(`${API_URL}/folders/`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ name, parent_id: parentId }),
    })
  }

  async updateFolder(folderId: string, data: { name?: string; parent_id?: string | null }): Promise<Folder> {
    return this.requestJson<Folder>(`${API_URL}/folders/${folderId}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(data),
    })
  }

  async deleteFolder(folderId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/folders/${folderId}`, {
        method: "DELETE",
        headers: this.headers,
      })
      return res.ok || res.status === 204
    } catch {
      return false
    }
  }

  // ─── Lessons & Todos ──────────────────────────────────────────────────

  async updateLessonPlannedDate(lessonId: string, plannedDate: string | null): Promise<LessonPlanResponse> {
    return this.requestJson<LessonPlanResponse>(`${API_URL}/lesplan/lessons/${lessonId}/planned-date`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify({ planned_date: plannedDate }),
    })
  }

  async updatePreparationTodo(
    todoId: string,
    data: UpdateLessonPreparationTodoRequest,
  ): Promise<LessonPreparationTodoResponse> {
    return this.requestJson<LessonPreparationTodoResponse>(`${API_URL}/lesplan/preparation-todos/${todoId}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(data),
    })
  }
}

/** Create an ApiClient instance for the given auth token. */
export function createApiClient(token: string | null): ApiClient {
  return new ApiClient(token)
}

/** Get the base API URL (server-only). */
export function getApiUrl(): string {
  return API_URL
}

/** Extract the access_token value from a Cookie header string. */
export function extractToken(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}
