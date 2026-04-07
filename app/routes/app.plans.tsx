import { useState } from "react"
import { BookOpen, Plus, ArrowRight, ChevronDown, ChevronRight } from "lucide-react"
import { Link, useLoaderData } from "react-router"
import { listLespannen, type LesplanStatus } from "~/lib/api"
import { requireAuthContext } from "~/lib/auth.server"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import type { Route } from "./+types/app.plans"

const STATUS_COPY: Record<LesplanStatus, { label: string; variant: "default" | "secondary" | "outline" | "tertiary" | "destructive" }> = {
  pending: { label: "Wacht op overzicht", variant: "outline" },
  generating_overview: { label: "Overzicht loopt", variant: "default" },
  overview_ready: { label: "Klaar voor review", variant: "secondary" },
  revising_overview: { label: "Revisie bezig", variant: "tertiary" },
  generating_lessons: { label: "Lessen worden gemaakt", variant: "default" },
  completed: { label: "Compleet", variant: "secondary" },
  failed: { label: "Mislukt", variant: "destructive" },
}

const formatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function meta() {
  return [{ title: "Plannen — Planwijs" }]
}

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const lespannen = await listLespannen(token)
  return { lespannen }
}

export default function PlansPage() {
  const { lespannen } = useLoaderData<typeof loader>()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-bold mb-1.5 text-[#0b1c30]">Plannen</h1>
          <p className="text-[#464554] text-sm">Heropen, volg en bekijk je lesplannen.</p>
        </div>
        <Button asChild className="flex-shrink-0 gap-2">
          <Link to="/lesplan/new">
            <Plus className="w-4 h-4" />
            Nieuw lesplan
          </Link>
        </Button>
      </div>

      {lespannen.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 flex flex-col items-center gap-4 text-center shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
          <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-[#5c5378]" />
          </div>
          <div>
            <p className="font-semibold text-base text-[#0b1c30]">Nog geen lesplannen</p>
            <p className="text-sm text-[#464554] mt-1">
              Start een nieuw lesplan en volg de workflow hier verder.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {lespannen.map((lesplan, index) => {
            const status = STATUS_COPY[lesplan.status]
            const lessons = lesplan.overview?.lessons ?? []
            const hasLessons = lessons.length > 0
            const isExpanded = expandedIds.has(lesplan.id)

            return (
              <div
                key={lesplan.id}
                className={[
                  "rounded-2xl transition-all",
                  index % 2 === 0 ? "bg-white" : "bg-[#eff4ff]",
                  hasLessons && isExpanded ? "shadow-[0px_24px_40px_rgba(11,28,48,0.09)]" : "",
                ].join(" ")}
              >
                {/* Main row */}
                <Link
                  to={`/lesplan/${lesplan.id}`}
                  className="group block hover:shadow-[0px_24px_40px_rgba(11,28,48,0.09)] hover:-translate-y-px transition-all rounded-2xl"
                >
                  <div className="p-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-base font-semibold text-[#0b1c30] truncate">{lesplan.overview?.title ?? "Lesplan in opbouw"}</p>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-[#464554]">
                        <span>{lesplan.num_lessons} lessen</span>
                        <span>{lesplan.lesson_duration_minutes} minuten</span>
                        <span>{lesplan.selected_paragraph_ids.length} paragrafen</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-[#464554]">
                      <span>{formatter.format(new Date(lesplan.updated_at))}</span>
                      <ArrowRight className="w-4 h-4 group-hover:text-[#2a14b4] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </Link>

                {/* Expand toggle */}
                {hasLessons && (
                  <div className={`px-5 ${isExpanded ? "pb-2" : "pb-4"}`}>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(lesplan.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#5c5378] hover:text-[#2a14b4] transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      {isExpanded ? "Verberg lessen" : `Toon ${lessons.length} uitgewerkte lessen`}
                    </button>
                  </div>
                )}

                {/* Lesson list */}
                {hasLessons && isExpanded && (
                  <div className="px-5 pb-4">
                    <div className="rounded-lg overflow-hidden">
                      {lessons.map((lesson) => (
                        <Link
                          key={lesson.id}
                          to={`/lesplan/${lesplan.id}/les/${lesson.id}`}
                          className={[
                            "group flex items-center gap-2.5 px-3 py-2 hover:bg-[#2a14b4]/5 transition-colors rounded-md",
                          ].join(" ")}
                        >
                          <span className="text-[11px] font-semibold tabular-nums text-[#5c5378]/50 w-4 shrink-0 text-right">
                            {lesson.lesson_number}
                          </span>
                          <p className="text-sm font-medium text-[#464554] group-hover:text-[#0b1c30] flex-1 truncate transition-colors">{lesson.title}</p>
                          {lesson.planned_date && (
                            <span className="text-xs text-[#5c5378]/40 shrink-0 hidden sm:block">
                              {formatDate(lesson.planned_date)}
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-[#5c5378]/40 group-hover:text-[#2a14b4] transition-colors shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  })
}
