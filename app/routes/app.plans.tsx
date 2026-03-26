import { BookOpen, Plus, Sparkles } from "lucide-react"
import { Link, useLoaderData } from "react-router"
import { listLespannen, type LesplanStatus } from "~/lib/api"
import { requireAuthContext } from "~/lib/auth.server"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import type { Route } from "./+types/app.plans"

const STATUS_COPY: Record<LesplanStatus, { label: string; className: string }> = {
  pending: { label: "Wacht op overzicht", className: "bg-[#fdf4c4] text-black" },
  generating_overview: { label: "Overzicht loopt", className: "bg-[#c5d9f5] text-black" },
  overview_ready: { label: "Klaar voor review", className: "bg-[#c8ead8] text-black" },
  revising_overview: { label: "Revisie bezig", className: "bg-[#f9d5d3] text-black" },
  generating_lessons: { label: "Lessen worden gemaakt", className: "bg-[#dcd3f0] text-black" },
  completed: { label: "Compleet", className: "bg-[#c8ead8] text-black" },
  failed: { label: "Mislukt", className: "bg-[#f9d5d3] text-black" },
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
          <h1 className="text-4xl font-black mb-2">Plannen</h1>
          <p className="text-black/60 text-sm font-medium">Heropen, volg en bekijk je lesplannen.</p>
        </div>
        <Button asChild className="flex-shrink-0 gap-2">
          <Link to="/lesplan/new">
            <Plus className="w-4 h-4" />
            Nieuw lesplan
          </Link>
        </Button>
      </div>

      {lespannen.length === 0 ? (
        <div className="border-2 border-black border-dashed bg-white p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-2 border-black bg-[#f5f0e8] flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="font-black text-base">Nog geen lesplannen</p>
            <p className="text-xs text-black/60 mt-1">
              Start een nieuw lesplan en volg de workflow hier verder.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {lespannen.map((lesplan) => {
            const status = STATUS_COPY[lesplan.status]
            return (
              <Link
                key={lesplan.id}
                to={`/lesplan/${lesplan.id}`}
                className="block border-2 border-black bg-white hover:bg-[#fdf4c4] transition-colors"
              >
                <div className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black truncate">{lesplan.overview?.title ?? "Lesplan in opbouw"}</p>
                      <Badge className={status.className}>{status.label}</Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium text-black/60 break-all">Request ID: {lesplan.id}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm font-medium text-black/65">
                      <span>{lesplan.num_lessons} lessen</span>
                      <span>{lesplan.lesson_duration_minutes} minuten</span>
                      <span>{lesplan.selected_paragraph_ids.length} paragrafen</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm font-bold text-black/60">
                    <span>Laatst bijgewerkt {formatter.format(new Date(lesplan.updated_at))}</span>
                    <Sparkles className="w-4 h-4" />
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
