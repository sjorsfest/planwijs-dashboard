import type { LesplanStatus } from "~/lib/backend/types"

export const STATUS_COPY: Record<LesplanStatus, { label: string; variant: "default" | "secondary" | "outline" | "tertiary" | "destructive" }> = {
  pending: { label: "Wacht op overzicht", variant: "outline" },
  generating_overview: { label: "Overzicht loopt", variant: "default" },
  overview_ready: { label: "Klaar voor review", variant: "secondary" },
  revising_overview: { label: "Revisie bezig", variant: "tertiary" },
  revising_lesson: { label: "Les wordt aangepast", variant: "tertiary" },
  generating_lessons: { label: "Lessen worden gemaakt", variant: "default" },
  completed: { label: "Compleet", variant: "secondary" },
  failed: { label: "Mislukt", variant: "destructive" },
}

export const formatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short",
})
