import { BookOpen, Plus, ArrowRight } from "lucide-react"
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
  const { token, userId } = requireAuthContext(request)
  const lespannen = await listLespannen(token, userId)
  return { lespannen }
}

export default function PlansPage() {
  const { lespannen } = useLoaderData<typeof loader>()

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
            return (
              <Link
                key={lesplan.id}
                to={`/lesplan/${lesplan.id}`}
                className={[
                  "group block rounded-2xl transition-all hover:shadow-[0px_24px_40px_rgba(11,28,48,0.09)] hover:-translate-y-px",
                  index % 2 === 0 ? "bg-white" : "bg-[#eff4ff]",
                ].join(" ")}
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
            )
          })}
        </div>
      )}
    </div>
  )
}
