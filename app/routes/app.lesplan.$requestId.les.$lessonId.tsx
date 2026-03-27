import { data, Link, useFetcher, useLoaderData } from "react-router"
import { ArrowLeft, Calendar, CheckCircle2, Circle } from "lucide-react"
import {
  getBookDetail,
  getClass,
  getLesplan,
  getMethod,
  updatePreparationTodo,
  type LessonPlanResponse,
  type LessonPreparationTodoResponse,
} from "~/lib/api"
import { requireAuthContext } from "~/lib/auth.server"
import type { SourceContext } from "~/components/lesplan/types"
import type { Route } from "./+types/app.lesplan.$requestId.les.$lessonId"

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Les — Planwijs" }]
  return [{ title: `Les ${loaderData.lesson.lesson_number}: ${loaderData.lesson.title} — Planwijs` }]
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { token } = requireAuthContext(request)
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
  const { token } = requireAuthContext(request)
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

  return data({ ok: false, error: "Unknown intent" })
}

export default function LessonDetailPage() {
  const { requestId, lesson, sourceContext } = useLoaderData<typeof loader>()

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
          Les {lesson.lesson_number}
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <LessonDetail lesson={lesson} sourceContext={sourceContext} />
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]/70">{children}</p>
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

function formatPlannedDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function TodoCard({ todo }: { todo: LessonPreparationTodoResponse }) {
  const fetcher = useFetcher()

  const isSubmitting = fetcher.state !== "idle"
  const optimisticStatus = isSubmitting
    ? (fetcher.formData?.get("status") as "pending" | "done" | null ?? todo.status)
    : todo.status

  const isDone = optimisticStatus === "done"
  const nextStatus = isDone ? "pending" : "done"

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-[0px_4px_16px_rgba(11,28,48,0.06)] transition-opacity duration-150 ${isDone ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <fetcher.Form method="post" className="shrink-0 mt-0.5">
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

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <p className={`font-semibold text-sm leading-snug ${isDone ? "line-through text-[#5c5378]/50" : "text-[#0b1c30]"}`}>
              {todo.title}
            </p>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.1em] shrink-0 ${
                isDone
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-[#ffdf9f]/60 text-[#4c3700]"
              }`}
            >
              {isDone ? "Gedaan" : "Te doen"}
            </span>
          </div>

          <p className="mt-1.5 text-sm text-[#464554] leading-6">{todo.description}</p>

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
        </div>
      </div>
    </div>
  )
}

function LessonDetail({ lesson, sourceContext }: { lesson: LessonPlanResponse; sourceContext: SourceContext }) {
  const paragraphsById = new Map((sourceContext.selectedParagraphs ?? []).map((p) => [p.id, p.title]))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-[0px_4px_16px_rgba(42,20,180,0.25)]">
          {lesson.lesson_number}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]/70 mb-0.5">
            Les {lesson.lesson_number}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#0b1c30]">{lesson.title}</h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#5c5378]/50" />
            {lesson.planned_date ? (
              <span className="text-sm font-semibold text-[#464554]">{formatPlannedDate(lesson.planned_date)}</span>
            ) : (
              <span className="text-sm font-medium text-[#5c5378]/50 italic">Nog niet gepland</span>
            )}
          </div>
        </div>
      </div>

      {/* Learning objectives */}
      <section className="space-y-3">
        <SectionLabel>Leerdoelen</SectionLabel>
        <ul className="space-y-2">
          {lesson.learning_objectives.map((obj, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-[#464554] font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              {obj}
            </li>
          ))}
        </ul>
      </section>

      {/* Time sections */}
      <section className="space-y-3">
        <SectionLabel>Tijdschema</SectionLabel>
        <div className="overflow-x-auto rounded-2xl shadow-[0px_8px_24px_rgba(11,28,48,0.07)]">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-[#eff4ff]">
                {["Tijd", "Activiteit", "Beschrijving", "Type"].map((h, i, arr) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5c5378] ${i === 0 ? "rounded-tl-2xl" : ""} ${i === arr.length - 1 ? "rounded-tr-2xl" : ""}`}
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
                  className={`border-t border-[#eff4ff] hover:bg-[#f8f9ff] transition-colors ${i === lesson.time_sections.length - 1 ? "last:rounded-b-2xl" : ""}`}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Materials */}
        <section className="space-y-3">
          <SectionLabel>Benodigdheden</SectionLabel>
          <ul className="space-y-1.5">
            {lesson.required_materials.map((mat, i) => (
              <li key={i} className="text-sm text-[#464554] font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5c5378]/40 shrink-0" />
                {mat}
              </li>
            ))}
          </ul>
        </section>

        {/* Covered paragraphs */}
        <section className="space-y-3">
          <SectionLabel>Behandelde paragrafen</SectionLabel>
          <ul className="space-y-1.5">
            {lesson.covered_paragraph_ids.map((id) => (
              <li key={id} className="text-sm text-[#464554] font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ab8ffe] shrink-0" />
                {paragraphsById.get(id) ?? id}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Teacher notes */}
      <section className="space-y-3">
        <SectionLabel>Aantekeningen voor de docent</SectionLabel>
        <div className="bg-[#ffdf9f]/40 rounded-xl p-4 border-l-4 border-[#f9bd22]">
          <p className="text-sm leading-6 text-[#4c3700] font-medium whitespace-pre-wrap">{lesson.teacher_notes}</p>
        </div>
      </section>

      {/* Preparation todos */}
      <section className="space-y-3">
        <SectionLabel>Voorbereidingstaken</SectionLabel>
        {lesson.preparation_todos.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-[0px_8px_24px_rgba(11,28,48,0.05)]">
            <div className="w-10 h-10 rounded-full bg-[#eff4ff] flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5 text-[#5c5378]/40" />
            </div>
            <p className="text-sm font-semibold text-[#5c5378]">Geen voorbereidingstaken</p>
            <p className="text-xs text-[#5c5378]/60 mt-0.5">Er zijn nog geen taken toegevoegd voor deze les.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lesson.preparation_todos.map((todo) => (
              <TodoCard key={todo.id} todo={todo} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
