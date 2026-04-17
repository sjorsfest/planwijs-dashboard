import { ArrowRight, User } from "lucide-react"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { SubjectBadge } from "~/components/ui/subject-badge"
import { cn } from "~/lib/utils"
import type { ClassDifficulty } from "./types"

interface Props {
  selectedSubjectName: string
  lessonCount: number | null
  classSize: number | null
  classDifficulty: ClassDifficulty | null
  classDetailsValid: boolean
  onLessonCountChange: (value: number | null) => void
  onClassSizeChange: (value: number | null) => void
  onClassDifficultyChange: (value: ClassDifficulty) => void
  onConfirm: () => void
}

export function Step3ClassDetails({
  selectedSubjectName,
  lessonCount,
  classSize,
  classDifficulty,
  classDetailsValid,
  onLessonCountChange,
  onClassSizeChange,
  onClassDifficultyChange,
  onConfirm,
}: Props) {
  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-widest">
            Stap 3 van 6
          </Badge>
          <SubjectBadge
            subjectName={selectedSubjectName}
            variant="default"
            className="text-[10px] font-semibold uppercase tracking-widest"
          />
        </div>
        <h1 className="text-4xl font-bold mb-1.5 text-[#0b1c30]">Klas details</h1>
        <p className="text-sm text-[#464554]">
          Vertel iets over de lessen en klas waarvoor je dit plan maakt.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-3">Lessen</p>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#464554]">Aantal lessen</label>
            <input
              type="number"
              min={1}
              max={99}
              value={lessonCount ?? ""}
              onChange={(e) =>
                onLessonCountChange(e.target.value === "" ? null : Math.max(1, parseInt(e.target.value) || 1))
              }
              placeholder="bijv. 4"
              className="w-28 bg-[#d3e4fe] rounded-md px-3 py-2 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/40 focus:bg-[#d5d9e0] transition-all"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
          <div className="flex gap-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-3">Klasgrootte</p>
              <div className="flex items-start gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#464554]">Aantal leerlingen</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={classSize ?? ""}
                    onChange={(e) =>
                      onClassSizeChange(e.target.value === "" ? null : Math.max(1, parseInt(e.target.value) || 1))
                    }
                    placeholder="bijv. 28"
                    className="w-28 bg-[#d3e4fe] rounded-md px-3 py-2 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/40 focus:bg-[#d5d9e0] transition-all"
                  />
                </div>
              </div>
            </div>
            {classSize !== null && classSize > 0 && (
              <div className="flex flex-col gap-0.5">
                {Array.from({ length: Math.ceil(Math.min(classSize, 35) / 6) }).map((_, row) => (
                  <div key={row} className="flex gap-0.5">
                    {Array.from({ length: Math.min(6, Math.min(classSize, 35) - row * 6) }).map((_, col) => (
                      <User key={col} className="w-5 h-5 text-[#5c5378]" strokeWidth={1.5} />
                    ))}
                  </div>
                ))}
                {classSize > 35 && (
                  <span className="text-[10px] font-semibold text-[#464554]/60 mt-0.5">+{classSize - 35} meer</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-3">Moeilijkheidsgraad klas</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: "Groen", description: "Goed hanteerbaar" },
                { value: "Oranje", description: "Vraagt extra aandacht" },
                { value: "Rood", description: "Intensieve begeleiding nodig" },
              ] as { value: ClassDifficulty; description: string }[]
            ).map(({ value: d, description }) => (
              <button
                key={d}
                onClick={() => onClassDifficultyChange(d)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all text-left",
                  classDifficulty === d
                    ? d === "Groen"
                      ? "bg-emerald-500 text-white shadow-[0px_4px_12px_rgba(16,185,129,0.3)]"
                      : d === "Oranje"
                      ? "bg-orange-400 text-white shadow-[0px_4px_12px_rgba(251,146,60,0.3)]"
                      : "bg-red-500 text-white shadow-[0px_4px_12px_rgba(239,68,68,0.3)]"
                    : "bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff]"
                )}
              >
                <span
                  className={cn(
                    "w-3 h-3 rounded-full flex-shrink-0",
                    d === "Groen"
                      ? classDifficulty === d ? "bg-white/80" : "bg-emerald-500"
                      : d === "Oranje"
                      ? classDifficulty === d ? "bg-white/80" : "bg-orange-400"
                      : classDifficulty === d ? "bg-white/80" : "bg-red-500"
                  )}
                />
                <span className="font-semibold">{d}</span>
                <span className={cn("text-xs font-medium", classDifficulty === d ? "text-white/80" : "text-[#464554]/70")}>
                  {description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Button disabled={!classDetailsValid} onClick={onConfirm} className="gap-2">
          Volgende
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </>
  )
}
