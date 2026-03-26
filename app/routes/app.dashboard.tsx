import { CalendarDays, BookOpen, Plus } from "lucide-react"
import { Link } from "react-router"
import { Button } from "~/components/ui/button"

export function meta() {
  return [{ title: "Dashboard — Planwijs" }]
}

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-black mb-2">Welkom terug!</h1>
          <p className="text-black/60 text-sm font-medium">Wat wil je vandaag doen?</p>
        </div>
        <Button asChild className="flex-shrink-0 gap-2">
          <Link to="/lesplan/new">
            <Plus className="w-4 h-4" />
            Nieuw lesplan
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/calendar"
          className="group border-2 border-black bg-[#c5d9f5] p-6 hover:bg-[#fdf4c4] transition-colors flex flex-col gap-3"
        >
          <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center group-hover:bg-black transition-colors">
            <CalendarDays className="w-5 h-5 group-hover:text-white transition-colors" />
          </div>
          <div>
            <p className="font-black text-base">Kalender</p>
            <p className="text-xs text-black/60 mt-0.5">
              Bekijk en beheer je lessen per dag.
            </p>
          </div>
        </Link>

        <Link
          to="/plans"
          className="group border-2 border-black bg-[#f9d5d3] p-6 hover:bg-[#fdf4c4] transition-colors flex flex-col gap-3"
        >
          <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center group-hover:bg-black transition-colors">
            <BookOpen className="w-5 h-5 group-hover:text-white transition-colors" />
          </div>
          <div>
            <p className="font-black text-base">Plannen</p>
            <p className="text-xs text-black/60 mt-0.5">
              Beheer je lesplannen en materialen.
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
