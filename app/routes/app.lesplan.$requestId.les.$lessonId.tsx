import { data, Link, useLoaderData } from "react-router"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import {
  getBookDetail,
  getClass,
  getLesplan,
  getMethod,
  type LessonPlanResponse,
} from "~/lib/api"
import { requireAuthContext } from "~/lib/auth.server"
import { Badge } from "~/components/ui/badge"
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

export default function LessonDetailPage() {
  const { requestId, lesson, sourceContext } = useLoaderData<typeof loader>()

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-black/8 px-6 py-3 flex items-center gap-4">
        <Link
          to={`/lesplan/${requestId}`}
          className="flex items-center gap-1.5 text-sm font-semibold text-black/50 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar overzicht
        </Link>
        <span className="text-black/20">·</span>
        <span className="text-sm font-semibold text-black/60">
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
    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/35">{children}</p>
  )
}

const activityTypeStyles: Record<string, string> = {
  introduction: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  instruction: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  activity: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  closure: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
}

function ActivityTypeBadge({ type }: { type: string }) {
  const style = activityTypeStyles[type.toLowerCase()] ?? "bg-black/5 text-black/60 ring-1 ring-black/10"
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.12em] ${style}`}>
      {type}
    </span>
  )
}

function LessonDetail({ lesson, sourceContext }: { lesson: LessonPlanResponse; sourceContext: SourceContext }) {
  const paragraphsById = new Map((sourceContext.selectedParagraphs ?? []).map((p) => [p.id, p.title]))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-lg font-black shrink-0">
          {lesson.lesson_number}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/35 mb-0.5">
            Les {lesson.lesson_number}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-black">{lesson.title}</h1>
        </div>
      </div>

      {/* Learning objectives */}
      <section className="space-y-3">
        <SectionLabel>Leerdoelen</SectionLabel>
        <ul className="space-y-2">
          {lesson.learning_objectives.map((obj, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-black/75 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              {obj}
            </li>
          ))}
        </ul>
      </section>

      {/* Time sections */}
      <section className="space-y-3">
        <SectionLabel>Tijdschema</SectionLabel>
        <div className="overflow-x-auto rounded-2xl shadow-sm ring-1 ring-black/8">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-black/[0.05]">
                {["Tijd", "Activiteit", "Beschrijving", "Type"].map((h, i, arr) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.18em] text-black/40 ${i === 0 ? "rounded-tl-2xl" : ""} ${i === arr.length - 1 ? "rounded-tr-2xl" : ""}`}
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
                  className={`border-t border-black/6 hover:bg-black/[0.02] transition-colors ${i === lesson.time_sections.length - 1 ? "last:rounded-b-2xl" : ""}`}
                >
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="font-black text-black tabular-nums">{section.start_min}–{section.end_min}</span>
                    <span className="text-black/35 font-medium text-xs ml-1">min</span>
                  </td>
                  <td className="px-5 py-4 font-bold text-black">{section.activity}</td>
                  <td className="px-5 py-4 text-black/60 leading-6">{section.description}</td>
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
              <li key={i} className="text-sm text-black/65 font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-black/25 shrink-0" />
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
              <li key={id} className="text-sm text-black/65 font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                {paragraphsById.get(id) ?? id}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Teacher notes */}
      <section className="space-y-3">
        <SectionLabel>Aantekeningen voor de docent</SectionLabel>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm leading-6 text-amber-900 font-medium whitespace-pre-wrap">{lesson.teacher_notes}</p>
        </div>
      </section>

      {/* Preparation todos */}
      {lesson.preparation_todos.length > 0 && (
        <section className="space-y-3">
          <SectionLabel>Voorbereidingstaken</SectionLabel>
          <div className="space-y-3">
            {lesson.preparation_todos.map((todo) => (
              <div key={todo.id} className="bg-white rounded-xl border border-black/8 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-sm text-black">{todo.title}</p>
                  <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-[0.12em] shrink-0">
                    {todo.status}
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm text-black/60 leading-6">{todo.description}</p>
                {todo.why && (
                  <p className="mt-2 text-xs text-black/40 font-medium">
                    <span className="font-bold">Waarom:</span> {todo.why}
                  </p>
                )}
                {todo.due_date && (
                  <p className="mt-1 text-xs text-black/40 font-medium">
                    <span className="font-bold">Deadline:</span> {todo.due_date}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
