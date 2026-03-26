import { BookOpen } from "lucide-react"
import type { Subject } from "~/lib/api"
import { Badge } from "~/components/ui/badge"
import type { Level, SchoolYear } from "./types"

interface Props {
  selectedLevel: Level
  selectedYear: SchoolYear
  subjects: Subject[]
  subjectsLoading: boolean
  onSubjectSelect: (subject: Subject) => void
}

export function Step2Subject({ selectedLevel, selectedYear, subjects, subjectsLoading, onSubjectSelect }: Props) {
  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">
            Stap 2 van 6
          </Badge>
          <Badge className="text-[10px] font-black uppercase tracking-widest bg-black text-white">
            {selectedLevel}
          </Badge>
          <Badge className="text-[10px] font-black uppercase tracking-widest bg-black text-white">
            {selectedYear}
          </Badge>
        </div>
        <h1 className="text-4xl font-black mb-1">Kies een vak</h1>
        <p className="text-sm text-black/60 font-medium">Kies het vak voor dit lesplan.</p>
      </div>

      {subjectsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border-2 border-black bg-white px-4 py-3 space-y-2 animate-pulse">
              <div className="h-4 bg-black/10 w-3/4" />
              <div className="h-3 bg-black/10 w-1/2" />
            </div>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState message="Geen vakken gevonden." />
      ) : (
        <div className="space-y-6">
          {Object.entries(
            subjects.reduce<Record<string, Subject[]>>((acc, subject) => {
              const cat = subject.category ?? "Overig"
              ;(acc[cat] ??= []).push(subject)
              return acc
            }, {})
          )
            .sort(([a], [b]) => a.localeCompare(b, "nl"))
            .map(([category, categorySubjects]) => (
              <div key={category}>
                <p className="text-xs font-black uppercase tracking-widest text-black/40 mb-2">{category}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {categorySubjects
                    .sort((a, b) => a.name.localeCompare(b.name, "nl"))
                    .map((subject) => (
                      <button
                        key={subject.id}
                        onClick={() => onSubjectSelect(subject)}
                        className="border-2 border-black bg-white px-4 py-3 text-left hover:bg-[#fdf4c4] hover:shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
                      >
                        <p className="text-sm font-black leading-tight">{subject.name}</p>
                      </button>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border-2 border-black border-dashed bg-white p-10 flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 border-2 border-black bg-[#f5f0e8] flex items-center justify-center">
        <BookOpen className="w-5 h-5" />
      </div>
      <div>
        <p className="font-black text-sm">Niets gevonden</p>
        <p className="text-xs text-black/60 mt-0.5">{message}</p>
      </div>
    </div>
  )
}
