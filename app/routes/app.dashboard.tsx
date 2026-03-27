import { CalendarDays, BookOpen, Plus, ArrowRight } from "lucide-react"
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
          <h1 className="text-4xl font-bold mb-1.5 text-[#0b1c30]">Welkom terug!</h1>
          <p className="text-[#464554] text-sm">Wat wil je vandaag doen?</p>
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
          className="group bg-white rounded-2xl p-6 shadow-[0px_24px_40px_rgba(11,28,48,0.07)] hover:shadow-[0px_28px_48px_rgba(11,28,48,0.11)] transition-all hover:-translate-y-0.5 flex flex-col gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-[#2a14b4] group-hover:to-[#4338ca] transition-all">
            <CalendarDays className="w-5 h-5 text-[#2a14b4] group-hover:text-white transition-colors" />
          </div>
          <div>
            <p className="font-semibold text-base text-[#0b1c30]">Kalender</p>
            <p className="text-sm text-[#464554] mt-0.5">
              Bekijk en beheer je lessen per dag.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#5c5378] group-hover:text-[#2a14b4] group-hover:translate-x-0.5 transition-all mt-auto" />
        </Link>

        <Link
          to="/plans"
          className="group bg-white rounded-2xl p-6 shadow-[0px_24px_40px_rgba(11,28,48,0.07)] hover:shadow-[0px_28px_48px_rgba(11,28,48,0.11)] transition-all hover:-translate-y-0.5 flex flex-col gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-[#2a14b4] group-hover:to-[#4338ca] transition-all">
            <BookOpen className="w-5 h-5 text-[#2a14b4] group-hover:text-white transition-colors" />
          </div>
          <div>
            <p className="font-semibold text-base text-[#0b1c30]">Plannen</p>
            <p className="text-sm text-[#464554] mt-0.5">
              Beheer je lesplannen en materialen.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#5c5378] group-hover:text-[#2a14b4] group-hover:translate-x-0.5 transition-all mt-auto" />
        </Link>
      </div>
    </div>
  )
}
