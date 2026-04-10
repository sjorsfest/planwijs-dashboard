import type { ReactNode } from "react"
import { Link, useLoaderData } from "react-router"
import { CheckCircle2, CircleDashed, ListTodo } from "lucide-react"
import { TodoCard } from "~/components/todos/todo-card"
import type { loader } from "./route"
import type { UserTodoListItem } from "./route"
import { SECTION_COPY } from "./constants"

export default function TodosPage() {
  const { todoItems } = useLoaderData<typeof loader>()
  const pendingItems = todoItems.filter((item) => item.todo.status === "pending")
  const doneItems = todoItems.filter((item) => item.todo.status === "done")

  return (
    <div className="min-h-screen bg-[#f8f9ff] p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]/70 mb-1">
              Lesvoorbereiding
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0b1c30]">To Do&apos;s</h1>
            <p className="mt-1 text-sm text-[#464554]">
              Alle voorbereidingstaken uit je lessen, met je voortgang op één plek.
            </p>
          </div>

          <Link
            to="/plans"
            prefetch="intent"
            className="inline-flex items-center justify-center rounded-xl border border-[#dce7ff] bg-white px-4 py-2 text-sm font-semibold text-[#2a14b4] shadow-[0px_8px_20px_rgba(11,28,48,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0px_12px_28px_rgba(11,28,48,0.08)]"
          >
            Bekijk plannen
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Totaal"
            value={todoItems.length}
            description="Alle open en afgeronde voorbereidingstaken."
            accent="bg-[#eff4ff] text-[#2a14b4]"
            icon={<ListTodo className="h-4 w-4" />}
          />
          <SummaryCard
            label="Te doen"
            value={pendingItems.length}
            description="Taken die nog aandacht nodig hebben."
            accent="bg-[#ffdf9f]/60 text-[#4c3700]"
            icon={<CircleDashed className="h-4 w-4" />}
          />
          <SummaryCard
            label="Gedaan"
            value={doneItems.length}
            description="Taken die je al hebt afgerond."
            accent="bg-emerald-50 text-emerald-700"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
        </div>

        {todoItems.length === 0 ? (
          <div className="rounded-3xl border border-[#e8eeff] bg-white px-8 py-14 text-center shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff4ff]">
              <ListTodo className="h-7 w-7 text-[#2a14b4]" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[#0b1c30]">Nog geen voorbereidingstaken</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#464554]">
              Zodra je lessen met voorbereidingstaken hebt, verschijnen ze hier automatisch zodat je alles vanuit één overzicht kunt afvinken.
            </p>
            <Link
              to="/plans"
              prefetch="intent"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-[#2a14b4] to-[#4338ca] px-4 py-2 text-sm font-semibold text-white shadow-[0px_4px_16px_rgba(42,20,180,0.25)] transition-all hover:shadow-[0px_8px_24px_rgba(42,20,180,0.35)]"
            >
              Naar je plannen
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <TodoSection status="pending" items={pendingItems} />
            <TodoSection status="done" items={doneItems} />
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  description,
  accent,
  icon,
}: {
  label: string
  value: number
  description: string
  accent: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[#e8eeff] bg-white p-4 sm:p-5 shadow-[0px_16px_32px_rgba(11,28,48,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c5378]/70">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#0b1c30]">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${accent}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#464554]">{description}</p>
    </div>
  )
}

function TodoSection({
  status,
  items,
}: {
  status: "pending" | "done"
  items: UserTodoListItem[]
}) {
  const copy = SECTION_COPY[status]

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]/70">{copy.eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold text-[#0b1c30]">{copy.title}</h2>
        </div>
        <span className="inline-flex min-w-10 items-center justify-center rounded-full border border-[#dce7ff] bg-white px-3 py-1 text-sm font-semibold text-[#2a14b4]">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#dce7ff] bg-white/80 px-5 py-6 text-sm text-[#5c5378] shadow-[0px_8px_24px_rgba(11,28,48,0.04)]">
          <p className="font-semibold text-[#0b1c30]">{copy.emptyTitle}</p>
          <p className="mt-1 text-[#464554]">{copy.emptyDescription}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <TodoCard
              key={item.todo.id}
              todo={item.todo}
              context={{
                href: `/lesplan/${item.requestId}/les/${item.lessonId}`,
                lessonLabel: `Les ${item.lessonNumber}: ${item.lessonTitle}`,
                planTitle: item.planTitle,
              }}
            />
          ))}
        </div>
      )}
    </section>
  )
}
