import { Link, useLoaderData, useFetcher } from "react-router"
import {
  CalendarDays,
  BookOpen,
  Plus,
  ArrowRight,
  CircleDashed,
  CheckCircle2,
  Users,
  Clock,
  CalendarPlus,
} from "lucide-react"
import { Button } from "~/components/ui/button"
import type { loader } from "./route"
import { formatDateShort } from "./utils"

export default function DashboardPage() {
  const {
    totalPlans,
    activePlans,
    completedPlans,
    pendingTodoCount,
    doneTodoCount,
    totalTodoCount,
    classCount,
    upcomingLessons,
    upcomingTodos,
    unplannedLessons,
  } = useLoaderData<typeof loader>()

  return (
    <div className="min-h-screen bg-[#f8f9ff] p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#0b1c30]">
              Welkom terug!
            </h1>
            <p className="text-sm text-[#464554] mt-1">
              Hier is een overzicht van je lesplanning.
            </p>
          </div>
          <Button asChild className="flex-shrink-0 gap-2 w-full sm:w-auto">
            <Link to="/lesplan/new" prefetch="intent">
              <Plus className="w-4 h-4" />
              Nieuw lesplan
            </Link>
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatCard
            label="Lesplannen"
            value={totalPlans}
            sub={activePlans > 0 ? `${activePlans} actief` : `${completedPlans} compleet`}
            icon={<BookOpen className="w-4 h-4" />}
            accent="bg-[#eff4ff] text-[#2a14b4]"
          />
          <StatCard
            label="Te doen"
            value={pendingTodoCount}
            sub={totalTodoCount > 0 ? `van ${totalTodoCount} totaal` : "geen taken"}
            icon={<CircleDashed className="w-4 h-4" />}
            accent="bg-[#ffdf9f]/60 text-[#4c3700]"
          />
          <StatCard
            label="Afgerond"
            value={doneTodoCount}
            sub={totalTodoCount > 0 ? `${Math.round((doneTodoCount / totalTodoCount) * 100)}% klaar` : "geen taken"}
            icon={<CheckCircle2 className="w-4 h-4" />}
            accent="bg-emerald-50 text-emerald-700"
          />
          <StatCard
            label="Klassen"
            value={classCount}
            sub={classCount === 1 ? "klas ingesteld" : "klassen ingesteld"}
            icon={<Users className="w-4 h-4" />}
            accent="bg-[#eff4ff] text-[#2a14b4]"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Upcoming lessons */}
            <section className="bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#eff4ff] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-[#2a14b4]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0b1c30]">Komende lessen</p>
                    <p className="text-[11px] text-[#5c5378]">De komende 2 weken</p>
                  </div>
                </div>
                <Link
                  to="/calendar"
                  prefetch="intent"
                  className="text-xs font-semibold text-[#2a14b4] hover:underline flex items-center gap-1"
                >
                  Kalender
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {upcomingLessons.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-[#5c5378]">Geen lessen gepland</p>
                  <p className="text-xs text-[#5c5378]/60 mt-0.5">
                    Plan data in bij je lessen om ze hier te zien.
                  </p>
                </div>
              ) : (
                <div>
                  {upcomingLessons.map((lesson) => (
                    <Link
                      key={lesson.id}
                      to={`/lesplan/${lesson.lesplan_id}/les/${lesson.id}`}
                      prefetch="intent"
                      className="group flex items-center gap-3 px-5 py-3.5 border-b border-[#eff4ff] last:border-0 hover:bg-[#f8f9ff] transition-colors"
                    >
                      <div className="w-12 text-center shrink-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2a14b4] bg-[#eff4ff] rounded px-1.5 py-0.5">
                          Les {lesson.lesson_number}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0b1c30] truncate group-hover:text-[#2a14b4] transition-colors">
                          {lesson.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-[#5c5378]/70 truncate">
                            {lesson.lesplan_title}
                          </p>
                          {lesson.className && (
                            <>
                              <span className="text-[#5c5378]/30">·</span>
                              <span className="text-[10px] font-medium text-[#2a14b4]/70 bg-[#eff4ff] rounded px-1.5 py-0.5 shrink-0">
                                {lesson.className}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-[#5c5378] shrink-0 capitalize">
                        {formatDateShort(lesson.planned_date)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Unplanned lessons */}
            {unplannedLessons.length > 0 && (
              <section className="bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#eff4ff] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#ffdf9f]/60 flex items-center justify-center">
                      <CalendarPlus className="w-4 h-4 text-[#4c3700]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0b1c30]">Lessen zonder datum</p>
                      <p className="text-[11px] text-[#5c5378]">{unplannedLessons.length} {unplannedLessons.length === 1 ? "les" : "lessen"} nog in te plannen</p>
                    </div>
                  </div>
                </div>

                <div>
                  {unplannedLessons.map((lesson) => (
                    <UnplannedLessonRow key={lesson.id} lesson={lesson} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right column (hidden on mobile - content accessible via bottom nav) */}
          <div className="hidden lg:block space-y-6">
            {/* Pending todos */}
            <section className="bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#eff4ff] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#ffdf9f]/60 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[#4c3700]" />
                  </div>
                  <p className="text-sm font-semibold text-[#0b1c30]">Binnenkort te doen</p>
                </div>
                <Link
                  to="/todo"
                  prefetch="intent"
                  className="text-xs font-semibold text-[#2a14b4] hover:underline flex items-center gap-1"
                >
                  Alles
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {upcomingTodos.length === 0 && pendingTodoCount === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-[#5c5378]">Alles is bijgewerkt</p>
                  <p className="text-xs text-[#5c5378]/60 mt-0.5">
                    Geen openstaande voorbereidingstaken.
                  </p>
                </div>
              ) : upcomingTodos.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm text-[#5c5378]">
                    {pendingTodoCount} openstaande {pendingTodoCount === 1 ? "taak" : "taken"} zonder deadline
                  </p>
                  <Link
                    to="/todos"
                    prefetch="intent"
                    className="mt-2 inline-flex text-xs font-semibold text-[#2a14b4] hover:underline"
                  >
                    Bekijk alle taken
                  </Link>
                </div>
              ) : (
                <div>
                  {upcomingTodos.map((todo) => (
                    <Link
                      key={todo.id}
                      to={`/lesplan/${todo.lesplan_id}/les/${todo.lesson_id}`}
                      prefetch="intent"
                      className="group flex items-start gap-3 px-5 py-3.5 border-b border-[#eff4ff] last:border-0 hover:bg-[#f8f9ff] transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-orange-300 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0b1c30] truncate group-hover:text-orange-700 transition-colors">
                          {todo.title}
                        </p>
                        <p className="text-xs text-[#5c5378]/70 mt-0.5 truncate">
                          {todo.lesson_title} · {formatDateShort(todo.due_date)}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {pendingTodoCount > upcomingTodos.length && (
                    <div className="px-5 py-3 text-center border-t border-[#eff4ff]">
                      <Link
                        to="/todos"
                        prefetch="intent"
                        className="text-xs font-semibold text-[#5c5378] hover:text-[#2a14b4] transition-colors"
                      >
                        + {pendingTodoCount - upcomingTodos.length} meer
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function UnplannedLessonRow({
  lesson,
}: {
  lesson: {
    id: string
    title: string
    lesson_number: number
    lesplan_id: string
    lesplan_title: string
    className: string | null
  }
}) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#eff4ff] last:border-0">
      <div className="w-12 text-center shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4c3700] bg-[#ffdf9f]/60 rounded px-1.5 py-0.5">
          Les {lesson.lesson_number}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <Link
          to={`/lesplan/${lesson.lesplan_id}/les/${lesson.id}`}
          prefetch="intent"
          className="text-sm font-semibold text-[#0b1c30] truncate hover:text-[#2a14b4] transition-colors block"
        >
          {lesson.title}
        </Link>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-xs text-[#5c5378]/70 truncate">
            {lesson.lesplan_title}
          </p>
          {lesson.className && (
            <>
              <span className="text-[#5c5378]/30">·</span>
              <span className="text-[10px] font-medium text-[#2a14b4]/70 bg-[#eff4ff] rounded px-1.5 py-0.5 shrink-0">
                {lesson.className}
              </span>
            </>
          )}
        </div>
      </div>
      <fetcher.Form method="post" className="shrink-0">
        <input type="hidden" name="lessonId" value={lesson.id} />
        <input
          type="date"
          name="plannedDate"
          disabled={isSubmitting}
          onChange={(e) => {
            if (e.target.value) {
              e.target.form?.requestSubmit()
            }
          }}
          className="text-xs border border-[#eff4ff] rounded-lg px-2.5 py-1.5 text-[#5c5378] bg-[#f8f9ff] hover:border-[#2a14b4]/30 focus:border-[#2a14b4] focus:ring-1 focus:ring-[#2a14b4]/20 outline-none transition-colors cursor-pointer disabled:opacity-50"
        />
      </fetcher.Form>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string
  value: number
  sub: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="rounded-2xl bg-white p-3 sm:p-4 shadow-[0px_16px_32px_rgba(11,28,48,0.06)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c5378]/70">
          {label}
        </p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>
          {icon}
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-bold tracking-tight text-[#0b1c30] mt-1">{value}</p>
      <p className="text-xs text-[#5c5378] mt-0.5">{sub}</p>
    </div>
  )
}
