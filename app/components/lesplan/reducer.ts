import type { LesplanResponse, TaskSubmittedResponse, TaskStatusResponse } from "~/lib/backend/types"
import {
  mapFeedbackMessages,
  type LesplanPageState,
  type LesplanThreadMessage,
  type LesplanWorkspaceLoaderData,
  type SourceContext,
} from "./types"
import { normalizeOverview } from "./utils"

export type ActionData = {
  intent: "feedback" | "approve"
  ok: boolean
  task?: TaskSubmittedResponse
  error?: string
}

export type PendingFeedbackRequest = {
  teacherId: string
  placeholderId: string
}

export type StateAction =
  | { type: "hydrate"; payload: LesplanWorkspaceLoaderData }
  | { type: "task_started"; taskId: string; taskType: LesplanPageState["ui"]["activeTaskType"] }
  | { type: "task_progress"; status: TaskStatusResponse }
  | { type: "task_completed"; taskType: LesplanPageState["ui"]["activeTaskType"] }
  | { type: "task_failed"; error: string }
  | { type: "feedback_submit_start"; teacherId: string; teacherContent: string; placeholderId: string }
  | { type: "feedback_submit_failed"; teacherId: string; placeholderId: string; error: string }
  | { type: "feedback_submit_ack"; task: TaskSubmittedResponse; placeholderId: string }
  | { type: "approve_start" }
  | { type: "approve_success"; task: TaskSubmittedResponse }
  | { type: "approve_failed"; error: string }
  | { type: "set_polling"; active: boolean }
  | { type: "clear_error" }

export const STATUS_COPY: Record<LesplanPageState["status"], { label: string; color: string }> = {
  pending: { label: "Klaar om te starten", color: "bg-amber-100 text-amber-800" },
  generating_overview: { label: "Overzicht wordt opgebouwd…", color: "bg-blue-100 text-blue-800" },
  overview_ready: { label: "Klaar voor review", color: "bg-emerald-100 text-emerald-800" },
  revising_overview: { label: "Wordt aangepast…", color: "bg-[#eff4ff] text-[#2a14b4]" },
  revising_lesson: { label: "Les wordt aangepast…", color: "bg-[#eff4ff] text-[#2a14b4]" },
  generating_lessons: { label: "Lessen worden uitgewerkt…", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Lesplan compleet", color: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Genereren mislukt", color: "bg-red-100 text-red-800" },
}

const INITIAL_UI: LesplanPageState["ui"] = {
  activeTaskId: null,
  activeTaskType: null,
  taskProgress: 0,
  taskCurrentStep: null,
  taskSteps: [],
  taskLastCompletedCount: 0,
  sendingFeedback: false,
  approving: false,
  pollingLessons: false,
}

export function buildStateFromLoaderData(loaderData: LesplanWorkspaceLoaderData): LesplanPageState {
  return {
    requestId: loaderData.requestId,
    status: loaderData.lesplan.status,
    request: loaderData.request,
    sourceContext: loaderData.sourceContext,
    overview: normalizeOverview(loaderData.lesplan.overview),
    feedbackMessages: mapFeedbackMessages(loaderData.lesplan.feedback_messages ?? []),
    lessons: loaderData.lesplan.overview?.lessons ?? [],
    ui: { ...INITIAL_UI },
  }
}

function findPendingAssistant(messages: LesplanThreadMessage[]): LesplanThreadMessage | undefined {
  return messages.find((m) => m.pending && m.role === "assistant")
}

export function reducer(state: LesplanPageState, action: StateAction): LesplanPageState {
  switch (action.type) {
    case "hydrate": {
      const next = buildStateFromLoaderData(action.payload)
      const placeholder = findPendingAssistant(state.feedbackMessages)
      return {
        ...next,
        feedbackMessages: placeholder ? [...next.feedbackMessages, placeholder] : next.feedbackMessages,
        ui: {
          ...state.ui,
          pollingLessons:
            next.status === "generating_overview" ||
            next.status === "revising_overview" ||
            next.status === "generating_lessons"
              ? state.ui.pollingLessons
              : false,
          approving: false,
          sendingFeedback: false,
          lastError:
            next.status === "generating_overview" ||
            next.status === "revising_overview" ||
            next.status === "failed"
              ? state.ui.lastError
              : undefined,
        },
      }
    }
    case "task_started":
      return {
        ...state,
        ui: {
          ...state.ui,
          activeTaskId: action.taskId,
          activeTaskType: action.taskType,
          taskProgress: 0,
          taskCurrentStep: null,
          taskSteps: [],
          taskLastCompletedCount: 0,
          lastError: undefined,
        },
      }
    case "task_progress": {
      const completedCount = action.status.steps.filter((s) => s.status === "completed").length
      return {
        ...state,
        status: action.status.status === "running" || action.status.status === "queued"
          ? (state.ui.activeTaskType === "generate_overview" ? "generating_overview"
            : state.ui.activeTaskType === "apply_feedback" ? "revising_overview"
            : state.ui.activeTaskType === "generate_lessons" ? "generating_lessons"
            : state.status)
          : state.status,
        ui: {
          ...state.ui,
          taskProgress: action.status.progress_pct,
          taskCurrentStep: action.status.current_step,
          taskSteps: action.status.steps,
          taskLastCompletedCount: completedCount,
        },
      }
    }
    case "task_completed":
      return {
        ...state,
        ui: {
          ...state.ui,
          activeTaskId: null,
          activeTaskType: null,
          taskProgress: 0,
          taskCurrentStep: null,
          taskSteps: [],
          taskLastCompletedCount: 0,
          lastError: undefined,
        },
      }
    case "task_failed":
      return {
        ...state,
        ui: {
          ...state.ui,
          activeTaskId: null,
          activeTaskType: null,
          taskProgress: 0,
          taskCurrentStep: null,
          taskSteps: [],
          taskLastCompletedCount: 0,
          sendingFeedback: false,
          approving: false,
          lastError: action.error,
        },
      }
    case "feedback_submit_start":
      return {
        ...state,
        ui: { ...state.ui, sendingFeedback: true, lastError: undefined },
        feedbackMessages: [
          ...state.feedbackMessages,
          { id: action.teacherId, role: "teacher", content: action.teacherContent, createdAt: new Date().toISOString(), pending: true },
          { id: action.placeholderId, role: "assistant", content: "Overzicht wordt aangepast…", createdAt: new Date().toISOString(), pending: true },
        ],
      }
    case "feedback_submit_failed":
      return {
        ...state,
        ui: { ...state.ui, sendingFeedback: false, lastError: action.error },
        feedbackMessages: state.feedbackMessages.filter((m) => m.id !== action.teacherId && m.id !== action.placeholderId),
      }
    case "feedback_submit_ack":
      return {
        ...state,
        ui: {
          ...state.ui,
          sendingFeedback: false,
          activeTaskId: action.task.task_id,
          activeTaskType: "apply_feedback",
          taskProgress: 0,
          taskCurrentStep: null,
          taskSteps: [],
          taskLastCompletedCount: 0,
          lastError: undefined,
        },
      }
    case "approve_start":
      return { ...state, ui: { ...state.ui, approving: true, lastError: undefined } }
    case "approve_success":
      return {
        ...state,
        ui: {
          ...state.ui,
          approving: false,
          activeTaskId: action.task.task_id,
          activeTaskType: "generate_lessons",
          taskProgress: 0,
          taskCurrentStep: null,
          taskSteps: [],
          taskLastCompletedCount: 0,
          pollingLessons: true,
        },
      }
    case "approve_failed":
      return { ...state, ui: { ...state.ui, approving: false, lastError: action.error } }
    case "set_polling":
      return { ...state, ui: { ...state.ui, pollingLessons: action.active } }
    case "clear_error":
      return { ...state, ui: { ...state.ui, lastError: undefined } }
    default:
      return state
  }
}

export function buildSourceContext(
  lesplan: LesplanResponse,
  context: {
    bookTitle?: string
    bookCoverUrl?: string
    subjectName?: string
    methodTitle?: string
    level?: string
    schoolYear?: string
    classSize?: number
    difficulty?: string | null
    selectedParagraphs?: SourceContext["selectedParagraphs"]
  }
): SourceContext {
  return {
    bookTitle: context.bookTitle,
    bookCoverUrl: context.bookCoverUrl,
    subjectName: context.subjectName,
    methodTitle: context.methodTitle,
    level: context.level,
    schoolYear: context.schoolYear,
    classSize: context.classSize,
    difficulty: context.difficulty,
    selectedParagraphs: context.selectedParagraphs,
  }
}
