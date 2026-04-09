import type { LesplanResponse } from "~/lib/backend/types"
import {
  mapFeedbackMessages,
  type LesplanDoneEvent,
  type LesplanOverviewPartial,
  type LesplanPageState,
  type LesplanThreadMessage,
  type LesplanWorkspaceLoaderData,
  type SourceContext,
} from "./types"
import { normalizeOverview, mergeOverview } from "./utils"

export type ActionData = {
  intent: "feedback" | "approve"
  ok: boolean
  lesplan?: LesplanResponse
  error?: string
}

export type StatusEvent = {
  status: LesplanPageState["status"]
}

export type StreamRef = {
  mode: "overview" | "revision"
  close: () => void
}

export type PendingFeedbackRequest = {
  teacherId: string
  placeholderId: string
}

export type StateAction =
  | { type: "hydrate"; payload: LesplanWorkspaceLoaderData }
  | { type: "stream_connecting"; mode: "overview" | "revision" }
  | { type: "stream_connected"; status?: LesplanPageState["status"] }
  | { type: "stream_partial"; partial: LesplanOverviewPartial }
  | { type: "ensure_revision_placeholder"; placeholderId: string }
  | { type: "feedback_submit_start"; teacherId: string; teacherContent: string; placeholderId: string }
  | { type: "feedback_submit_failed"; teacherId: string; placeholderId: string; error: string }
  | { type: "feedback_submit_ack"; lesplan: LesplanResponse; placeholderId: string }
  | { type: "revision_done"; done: LesplanDoneEvent; placeholderId: string }
  | { type: "overview_done"; done: LesplanDoneEvent }
  | { type: "stream_error"; message: string }
  | { type: "approve_start" }
  | { type: "approve_success"; lesplan: LesplanResponse }
  | { type: "approve_failed"; error: string }
  | { type: "set_polling"; active: boolean }
  | { type: "clear_error" }

export const STATUS_COPY: Record<LesplanPageState["status"], { label: string; color: string }> = {
  pending: { label: "Klaar om te starten", color: "bg-amber-100 text-amber-800" },
  generating_overview: { label: "Overzicht wordt opgebouwd…", color: "bg-blue-100 text-blue-800" },
  overview_ready: { label: "Klaar voor review", color: "bg-emerald-100 text-emerald-800" },
  revising_overview: { label: "Wordt aangepast…", color: "bg-[#eff4ff] text-[#2a14b4]" },
  generating_lessons: { label: "Lessen worden uitgewerkt…", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Lesplan compleet", color: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Genereren mislukt", color: "bg-red-100 text-red-800" },
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
    ui: {
      streamConnected: false,
      streamMode: null,
      sendingFeedback: false,
      approving: false,
      pollingLessons: false,
    },
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
          streamConnected:
            next.status === "generating_overview" || next.status === "revising_overview"
              ? state.ui.streamConnected
              : false,
          streamMode:
            next.status === "generating_overview"
              ? "overview"
              : next.status === "revising_overview"
              ? "revision"
              : placeholder
              ? "revision"
              : null,
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
    case "stream_connecting":
      return { ...state, ui: { ...state.ui, streamConnected: false, streamMode: action.mode, lastError: undefined } }
    case "stream_connected":
      return { ...state, status: action.status ?? state.status, ui: { ...state.ui, streamConnected: true } }
    case "stream_partial":
      return { ...state, overview: mergeOverview(state.overview, action.partial) }
    case "ensure_revision_placeholder": {
      if (findPendingAssistant(state.feedbackMessages)) return state
      return {
        ...state,
        feedbackMessages: [
          ...state.feedbackMessages,
          { id: action.placeholderId, role: "assistant", content: "Overzicht wordt aangepast…", createdAt: new Date().toISOString(), pending: true },
        ],
      }
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
        status: action.lesplan.status,
        overview: normalizeOverview(action.lesplan.overview) ?? state.overview,
        lessons: action.lesplan.overview?.lessons ?? state.lessons,
        feedbackMessages: [
          ...mapFeedbackMessages(action.lesplan.feedback_messages ?? []),
          { id: action.placeholderId, role: "assistant", content: "Overzicht wordt aangepast…", createdAt: new Date().toISOString(), pending: true },
        ],
        ui: { ...state.ui, sendingFeedback: false, streamMode: "revision", lastError: undefined },
      }
    case "revision_done":
      return {
        ...state,
        status: action.done.status,
        overview: normalizeOverview(action.done.overview),
        feedbackMessages: state.feedbackMessages.map((m) =>
          m.id === action.placeholderId
            ? { ...m, content: action.done.assistant_message ?? "Het overzicht is bijgewerkt.", pending: false }
            : m
        ),
        ui: { ...state.ui, streamConnected: false, streamMode: null, lastError: undefined },
      }
    case "overview_done":
      return {
        ...state,
        status: action.done.status,
        overview: normalizeOverview(action.done.overview),
        ui: { ...state.ui, streamConnected: false, streamMode: null, lastError: undefined },
      }
    case "stream_error":
      return { ...state, ui: { ...state.ui, streamConnected: false, streamMode: null, sendingFeedback: false, approving: false, lastError: action.message } }
    case "approve_start":
      return { ...state, ui: { ...state.ui, approving: true, lastError: undefined } }
    case "approve_success":
      return {
        ...state,
        status: action.lesplan.status,
        overview: normalizeOverview(action.lesplan.overview) ?? state.overview,
        lessons: action.lesplan.overview?.lessons ?? state.lessons,
        feedbackMessages: mapFeedbackMessages(action.lesplan.feedback_messages ?? []),
        ui: { ...state.ui, approving: false, pollingLessons: true },
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
