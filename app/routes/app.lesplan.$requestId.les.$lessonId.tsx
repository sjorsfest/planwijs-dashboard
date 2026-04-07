import { useRef, useState } from "react"
import { data, Link, useFetcher, useLoaderData } from "react-router"
import { ArrowLeft, Calendar, CheckCircle2, Circle, Loader2, Pencil, X } from "lucide-react"
import {
  getBookDetail,
  getClass,
  getLesplan,
  getMethod,
  updateLessonPlannedDate,
  updatePreparationTodo,
  type LessonPlanResponse,
} from "~/lib/api"
import { TodoCard } from "~/components/todos/todo-card"
import { requireAuthContext } from "~/lib/auth.server"
import type { SourceContext } from "~/components/lesplan/types"
import type { Route } from "./+types/app.lesplan.$requestId.les.$lessonId"

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Les — Planwijs" }]
  return [{ title: `Les ${loaderData.lesson.lesson_number}: ${loaderData.lesson.title} — Planwijs` }]
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const lesplan = await getLesplan(token, params.requestId)

  if (!lesplan) {
    throw new Response("Lesplan not found", { status: 404 })
  }

  const lesson = lesplan.overview?.lessons?.find((l) => l.id === params.lessonId)
  if (!lesson) {
    throw new Response("Les not found", { status: 404 })
  }

  const [classroom, bookDetail] = await Promise.all([
    getClass(token, lesplan.class_id),
    getBookDetail(token, lesplan.book_id),
  ])

  const method = bookDetail?.method_id ? await getMethod(token, bookDetail.method_id) : null
  const paragraphsById = new Map(
    (bookDetail?.chapters ?? []).flatMap((chapter) =>
      chapter.paragraphs.map((paragraph) => [
        paragraph.id,
        { id: paragraph.id, title: paragraph.title, synopsis: paragraph.synopsis, index: paragraph.index },
      ])
    )
  )

  const sourceContext: SourceContext = {
    bookTitle: bookDetail?.title,
    subjectName: bookDetail?.subject_name ?? undefined,
    methodTitle: method?.title,
    level: classroom?.level,
    schoolYear: classroom?.school_year,
    classSize: classroom?.size,
    difficulty: classroom?.difficulty ?? undefined,
    selectedParagraphs: lesplan.selected_paragraph_ids.map((id) => paragraphsById.get(id) ?? { id, title: id }),
  }

  return data({ requestId: params.requestId, lesson, sourceContext })
}

export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "toggle-todo") {
    const todoId = formData.get("todoId") as string
    const status = formData.get("status") as "pending" | "done"
    try {
      const updated = await updatePreparationTodo(token, todoId, { status })
      return data({ ok: true, todo: updated })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Er ging iets mis"
      return data({ ok: false, error: message })
    }
  }

  if (intent === "set-planned-date") {
    const lessonId = formData.get("lessonId") as string
    const rawDate = formData.get("plannedDate") as string | null
    const plannedDate = rawDate || null
    try {
      await updateLessonPlannedDate(token, lessonId, plannedDate)
      return data({ ok: true })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Er ging iets mis"
      return data({ ok: false, error: message })
    }
  }

  return data({ ok: false, error: "Unknown intent" })
}

const LESSON_TABS = [
  { id: "overzicht", label: "Overzicht" },
  { id: "tijdschema", label: "Tijdschema" },
  { id: "notities", label: "Notities" },
  { id: "taken", label: "Taken" },
] as const

type LessonTabId = (typeof LESSON_TABS)[number]["id"]

export default function LessonDetailPage() {
  const { requestId, lesson, sourceContext } = useLoaderData<typeof loader>()
  const [activeTab, setActiveTab] = useState<LessonTabId>("overzicht")

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-[#e8eeff] px-6 py-3 flex items-center gap-4">
        <Link
          to={`/lesplan/${requestId}`}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#5c5378] hover:text-[#0b1c30] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar overzicht
        </Link>
        <span className="text-[#c7c4d7]">·</span>
        <span className="text-sm font-semibold text-[#464554]">
          Les {lesson.lesson_number}: {lesson.title}
        </span>
      </div>

      {/* Header card */}
      <div className="px-8 py-8 max-w-5xl">
        <LessonHeader lesson={lesson} />
      </div>

      {/* Tab nav */}
      <LessonTabNav activeTab={activeTab} onChange={setActiveTab} lesson={lesson} />

      {/* Tab content */}
      <div className="px-8 py-6 max-w-5xl">
        <TabPanel id="overzicht" activeTab={activeTab}>
          <OverviewTab lesson={lesson} sourceContext={sourceContext} />
        </TabPanel>

        <TabPanel id="tijdschema" activeTab={activeTab}>
          <TimeschemaTab lesson={lesson} />
        </TabPanel>

        <TabPanel id="notities" activeTab={activeTab}>
          <NotesTab lesson={lesson} />
        </TabPanel>

        <TabPanel id="taken" activeTab={activeTab}>
          <TakenTab lesson={lesson} />
        </TabPanel>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]/70">{children}</p>
  )
}

function formatPlannedDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function LessonHeader({ lesson }: { lesson: LessonPlanResponse }) {
  const fetcher = useFetcher()
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingTodos = lesson.preparation_todos.filter((t) => t.status === "pending").length
  const doneTodos = lesson.preparation_todos.filter((t) => t.status === "done").length

  const isSubmitting = fetcher.state !== "idle"
  const displayDate = lesson.planned_date
  const today = new Date().toISOString().slice(0, 10)

  function handleSave(date: string) {
    if (!date || date < today) return
    fetcher.submit(
      { intent: "set-planned-date", lessonId: lesson.id, plannedDate: date },
      { method: "post" }
    )
    setEditing(false)
  }

  function handleClear() {
    fetcher.submit(
      { intent: "set-planned-date", lessonId: lesson.id, plannedDate: "" },
      { method: "post" }
    )
    setEditing(false)
  }

  const stats = [
    { label: "Tijdsduur", value: `${lesson.time_sections.at(-1)?.end_min ?? "?"} min` },
    { label: "Activiteiten", value: String(lesson.time_sections.length) },
    { label: "Benodigdheden", value: String(lesson.required_materials.length) },
    { label: "Taken", value: `${doneTodos}/${lesson.preparation_todos.length}` },
  ]

  return (
    <section className="bg-white rounded-3xl p-6 shadow-[0px_18px_36px_rgba(11,28,48,0.08)] border border-[#e8eeff]">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-[0px_4px_16px_rgba(42,20,180,0.25)]">
          {lesson.lesson_number}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]/70 mb-0.5">
            Les {lesson.lesson_number}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#0b1c30] leading-tight">{lesson.title}</h1>
          <div className="flex items-center gap-1.5 mt-2">
            <Calendar className="w-3.5 h-3.5 text-[#5c5378]/50" />
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  ref={(el) => {
                    inputRef.current = el
                    if (el) {
                      try { el.showPicker() } catch { /* unsupported browsers */ }
                    }
                  }}
                  type="date"
                  defaultValue={displayDate ?? ""}
                  min={today}
                  autoFocus
                  className="text-sm font-semibold text-[#464554] bg-[#f8f9ff] border border-[#e8eeff] rounded-lg px-2 py-1 outline-none focus:border-[#4338ca] transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave(e.currentTarget.value)
                    if (e.key === "Escape") setEditing(false)
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (inputRef.current?.value) handleSave(inputRef.current.value)
                    else setEditing(false)
                  }}
                  className="text-[10px] font-semibold uppercase tracking-wider text-white bg-[#4338ca] hover:bg-[#2a14b4] rounded-md px-2.5 py-1 transition-colors"
                >
                  Opslaan
                </button>
                {displayDate && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[10px] font-semibold uppercase tracking-wider text-[#5c5378] hover:text-red-600 transition-colors"
                  >
                    Wissen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-[#5c5378]/50 hover:text-[#0b1c30] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 text-[#4338ca] animate-spin" />
                <span className="text-sm font-medium text-[#5c5378]/50">Opslaan…</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="group flex items-center gap-1.5 hover:text-[#4338ca] transition-colors"
              >
                {displayDate ? (
                  <span className="text-sm font-semibold text-[#464554] group-hover:text-[#4338ca]">{formatPlannedDate(displayDate)}</span>
                ) : (
                  <span className="text-sm font-medium text-[#5c5378]/50 italic group-hover:text-[#4338ca]">Nog niet gepland</span>
                )}
                <Pencil className="w-3 h-3 text-[#5c5378]/40 group-hover:text-[#4338ca] transition-colors" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-[#f8f9ff] rounded-xl border border-[#e8eeff] px-4 py-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5c5378]/70">{stat.label}</p>
            <p className="text-sm font-semibold text-[#0b1c30] mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {pendingTodos > 0 && (
        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center gap-2">
          <Circle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            {pendingTodos} voorbereidingstaak{pendingTodos !== 1 ? "en" : ""} nog te doen
          </p>
        </div>
      )}
    </section>
  )
}

function LessonTabNav({
  activeTab,
  onChange,
  lesson,
}: {
  activeTab: LessonTabId
  onChange: (tab: LessonTabId) => void
  lesson: LessonPlanResponse
}) {
  const pendingTodos = lesson.preparation_todos.filter((t) => t.status === "pending").length

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = LESSON_TABS.findIndex((tab) => tab.id === activeTab)
    if (currentIndex < 0) return

    let nextIndex = currentIndex
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % LESSON_TABS.length
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + LESSON_TABS.length) % LESSON_TABS.length
    if (event.key === "Home") nextIndex = 0
    if (event.key === "End") nextIndex = LESSON_TABS.length - 1

    if (nextIndex === currentIndex) return
    event.preventDefault()
    const nextTab = LESSON_TABS[nextIndex]
    onChange(nextTab.id)
    window.setTimeout(() => document.getElementById(`lesson-tab-${nextTab.id}`)?.focus(), 0)
  }

  return (
    <div className="sticky top-[57px] z-10 bg-[#f8f9ff]/90 backdrop-blur-sm border-b border-[#e8eeff]">
      <div
        role="tablist"
        aria-label="Les tabs"
        onKeyDown={handleKeyDown}
        className="px-8 py-2 max-w-5xl flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      >
        {LESSON_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const showBadge = tab.id === "taken" && pendingTodos > 0
          return (
            <button
              key={tab.id}
              id={`lesson-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`lesson-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={[
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap flex items-center gap-1.5",
                isActive
                  ? "bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white shadow-[0px_2px_8px_rgba(42,20,180,0.2)]"
                  : "text-[#5c5378] hover:text-[#0b1c30] hover:bg-[#eff4ff]",
              ].join(" ")}
            >
              {tab.label}
              {showBadge && (
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${isActive ? "bg-white/20" : "bg-amber-100 text-amber-700"}`}>
                  {pendingTodos}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TabPanel({
  id,
  activeTab,
  children,
}: {
  id: LessonTabId
  activeTab: LessonTabId
  children: React.ReactNode
}) {
  return (
    <section
      id={`lesson-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`lesson-tab-${id}`}
      hidden={activeTab !== id}
      className={activeTab === id ? "space-y-5" : "hidden"}
    >
      {children}
    </section>
  )
}

function OverviewTab({ lesson, sourceContext }: { lesson: LessonPlanResponse; sourceContext: SourceContext }) {
  const paragraphsById = new Map((sourceContext.selectedParagraphs ?? []).map((p) => [p.id, p.title]))

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl p-6 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
        <div className="mb-4">
          <SectionLabel>Leerdoelen</SectionLabel>
        </div>
        <ul className="space-y-2.5">
          {lesson.learning_objectives.map((obj, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-[#464554] font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{obj}</span>
            </li>
          ))}
        </ul>
      </section>

      {lesson.covered_paragraph_ids.length > 0 && (
        <section className="bg-white rounded-2xl p-6 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
          <div className="mb-4">
            <SectionLabel>Behandelde paragrafen</SectionLabel>
          </div>
          <ul className="space-y-2">
            {lesson.covered_paragraph_ids.map((id) => (
              <li key={id} className="rounded-xl border border-[#dce7ff] bg-[#f8fbff] px-3.5 py-2.5 text-sm text-[#394055]">
                {paragraphsById.get(id) ?? id}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

const activityTypeStyles: Record<string, string> = {
  introduction: "bg-blue-50 text-blue-700",
  instruction: "bg-[#ffdf9f]/60 text-[#4c3700]",
  activity: "bg-emerald-50 text-emerald-700",
  closure: "bg-[#eff4ff] text-[#2a14b4]",
  repetition: "bg-orange-50 text-orange-700",
}

function ActivityTypeBadge({ type }: { type: string }) {
  const style = activityTypeStyles[type.toLowerCase()] ?? "bg-[#eff4ff] text-[#464554]"
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.1em] ${style}`}>
      {type}
    </span>
  )
}

function TimeschemaTab({ lesson }: { lesson: LessonPlanResponse }) {
  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff] overflow-hidden">
        <div className="px-6 pt-5 pb-4">
          <SectionLabel>Tijdschema</SectionLabel>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-[#eff4ff]">
                {["Tijd", "Activiteit", "Beschrijving", "Type"].map((h, i, arr) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {lesson.time_sections.map((section, i) => (
                <tr
                  key={i}
                  className="border-t border-[#eff4ff] hover:bg-[#f8f9ff] transition-colors"
                >
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="font-bold text-[#0b1c30] tabular-nums">{section.start_min}–{section.end_min}</span>
                    <span className="text-[#5c5378]/60 font-medium text-xs ml-1">min</span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-[#0b1c30]">{section.activity}</td>
                  <td className="px-5 py-4 text-[#464554] leading-6">{section.description}</td>
                  <td className="px-5 py-4">
                    <ActivityTypeBadge type={section.activity_type} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function NotesTab({ lesson }: { lesson: LessonPlanResponse }) {
  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl p-6 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
        <div className="mb-4">
          <SectionLabel>Aantekeningen voor de docent</SectionLabel>
        </div>
        <div className="bg-[#ffdf9f]/40 rounded-xl p-4 border-l-4 border-[#f9bd22]">
          <p className="text-sm leading-6 text-[#4c3700] font-medium whitespace-pre-wrap">{lesson.teacher_notes}</p>
        </div>
      </section>

      {lesson.required_materials.length > 0 && (
        <section className="bg-white rounded-2xl p-6 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
          <div className="mb-4">
            <SectionLabel>Benodigdheden</SectionLabel>
          </div>
          <ul className="space-y-2">
            {lesson.required_materials.map((mat, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-[#464554] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5c5378]/40 shrink-0" />
                {mat}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function TakenTab({ lesson }: { lesson: LessonPlanResponse }) {
  if (lesson.preparation_todos.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center text-center shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
        <div className="w-12 h-12 rounded-full bg-[#eff4ff] flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6 text-[#5c5378]/40" />
        </div>
        <p className="text-sm font-semibold text-[#5c5378]">Geen voorbereidingstaken</p>
        <p className="text-xs text-[#5c5378]/60 mt-0.5">Er zijn nog geen taken toegevoegd voor deze les.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {lesson.preparation_todos.map((todo) => (
        <TodoCard key={todo.id} todo={todo} />
      ))}
    </div>
  )
}
