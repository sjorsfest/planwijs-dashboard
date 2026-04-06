import { ArrowRight, BookOpen, Calendar, CheckCircle2, ChevronDown, Circle } from "lucide-react"
import { useState } from "react"
import { Link, useFetcher } from "react-router"
import type { LessonPreparationTodoResponse } from "~/lib/api"

type TodoCardContext = {
  href: string
  lessonLabel: string
  planTitle?: string | null
}

type TodoCardProps = {
  todo: LessonPreparationTodoResponse
  context?: TodoCardContext
}

function formatPlannedDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function TodoCard({ todo, context }: TodoCardProps) {
  const fetcher = useFetcher()
  const [expanded, setExpanded] = useState(false)

  const isSubmitting = fetcher.state !== "idle"
  const optimisticStatus = isSubmitting
    ? ((fetcher.formData?.get("status") as "pending" | "done" | null) ?? todo.status)
    : todo.status

  const isDone = optimisticStatus === "done"
  const nextStatus = isDone ? "pending" : "done"

  return (
    <div
      className={[
        "bg-white rounded-2xl shadow-[0px_8px_24px_rgba(11,28,48,0.06)] border border-[#e8eeff] transition-opacity duration-150",
        isDone ? "opacity-60" : "",
      ].join(" ")}
    >
      {/* Collapsed header — always visible */}
      <div className="flex items-center gap-3 p-5">
        <fetcher.Form method="post" className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <input type="hidden" name="intent" value="toggle-todo" />
          <input type="hidden" name="todoId" value={todo.id} />
          <input type="hidden" name="status" value={nextStatus} />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-5 h-5 rounded-full flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a14b4]/30 disabled:cursor-wait"
            aria-label={isDone ? "Markeer als te doen" : "Markeer als gedaan"}
          >
            {isDone ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Circle className="w-5 h-5 text-[#5c5378]/30 hover:text-[#2a14b4]/60 transition-colors" />
            )}
          </button>
        </fetcher.Form>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-1 min-w-0 flex items-center justify-between gap-3 text-left cursor-pointer"
        >
          <p className={`font-semibold text-sm leading-snug ${isDone ? "line-through text-[#5c5378]/50" : "text-[#0b1c30]"}`}>
            {todo.title}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.1em] ${
                isDone ? "bg-emerald-50 text-emerald-700" : "bg-[#ffdf9f]/60 text-[#4c3700]"
              }`}
            >
              {isDone ? "Gedaan" : "Te doen"}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#5c5378]/40 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </div>
        </button>
      </div>

      {/* Expandable details */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pl-[3.25rem]">
            <p className="text-sm text-[#464554] leading-6">{todo.description}</p>

            {todo.why && (
              <p className="mt-2 text-xs text-[#5c5378]/70 font-medium">
                <span className="font-semibold text-[#5c5378]">Waarom:</span> {todo.why}
              </p>
            )}

            {todo.due_date && (
              <p className="mt-1.5 text-xs text-[#5c5378]/70 font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3 shrink-0" />
                <span className="font-semibold text-[#5c5378]">Deadline:</span> {formatPlannedDate(todo.due_date)}
              </p>
            )}

            {context && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#eff4ff] pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eff4ff] px-2.5 py-1 text-[11px] font-semibold text-[#2a14b4]">
                    <BookOpen className="h-3.5 w-3.5" />
                    {context.lessonLabel}
                  </span>
                  {context.planTitle && (
                    <span className="inline-flex items-center rounded-full bg-[#f8f9ff] px-2.5 py-1 text-[11px] font-medium text-[#5c5378] border border-[#e8eeff]">
                      {context.planTitle}
                    </span>
                  )}
                </div>

                <Link
                  to={context.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#2a14b4] hover:text-[#4338ca] transition-colors"
                >
                  Open les
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
