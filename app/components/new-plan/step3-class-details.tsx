import { ArrowRight, User } from "lucide-react"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import type { ClassDifficulty } from "./types"

interface Props {
  selectedSubjectName: string
  lessonCount: number | null
  lessonDuration: number | null
  classSize: number | null
  classDifficulty: ClassDifficulty | null
  classDetailsValid: boolean
  onLessonCountChange: (value: number | null) => void
  onLessonDurationChange: (value: number | null) => void
  onClassSizeChange: (value: number | null) => void
  onClassDifficultyChange: (value: ClassDifficulty) => void
  onConfirm: () => void
}

export function Step3ClassDetails({
  selectedSubjectName,
  lessonCount,
  lessonDuration,
  classSize,
  classDifficulty,
  classDetailsValid,
  onLessonCountChange,
  onLessonDurationChange,
  onClassSizeChange,
  onClassDifficultyChange,
  onConfirm,
}: Props) {
  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">
            Stap 3 van 6
          </Badge>
          <Badge className="text-[10px] font-black uppercase tracking-widest bg-black text-white">
            {selectedSubjectName}
          </Badge>
        </div>
        <h1 className="text-4xl font-black mb-1">Klas details</h1>
        <p className="text-sm text-black/60 font-medium">
          Vertel iets over de lessen en klas waarvoor je dit plan maakt.
        </p>
      </div>

      <div className="space-y-4">
        <div className="border-2 border-black bg-white p-5">
          <p className="text-xs font-black uppercase tracking-widest mb-3">Lessen</p>
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-black/60">Aantal lessen</label>
              <input
                type="number"
                min={1}
                max={99}
                value={lessonCount ?? ""}
                onChange={(e) =>
                  onLessonCountChange(e.target.value === "" ? null : Math.max(1, parseInt(e.target.value) || 1))
                }
                placeholder="bijv. 4"
                className="w-28 border-2 border-black px-3 py-2 text-sm font-bold outline-none focus:bg-[#fdf4c4] transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-black/60">Duur per les (minuten)</label>
              <div className="flex flex-wrap gap-2">
                {[45, 50, 60, 90].map((min) => (
                  <button
                    key={min}
                    onClick={() => onLessonDurationChange(min)}
                    className={cn(
                      "px-4 py-2 text-sm font-bold border-2 border-black transition-all",
                      lessonDuration === min ? "bg-black text-white" : "bg-white hover:bg-[#fdf4c4]"
                    )}
                  >
                    {min} min
                  </button>
                ))}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={lessonDuration !== null && ![45, 50, 60, 90].includes(lessonDuration) ? lessonDuration : ""}
                    onChange={(e) =>
                      onLessonDurationChange(e.target.value === "" ? null : Math.max(1, parseInt(e.target.value) || 1))
                    }
                    placeholder="Anders"
                    className="w-20 border-2 border-black px-3 py-2 text-sm font-bold outline-none focus:bg-[#fdf4c4] transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-2 border-black bg-white p-5">
          <div className="flex gap-10">
            <div>
          <p className="text-xs font-black uppercase tracking-widest mb-3">Klasgrootte</p>
          <div className="flex items-start gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-black/60">Aantal leerlingen</label>
              <input
                type="number"
                min={1}
                max={99}
                value={classSize ?? ""}
                onChange={(e) =>
                  onClassSizeChange(e.target.value === "" ? null : Math.max(1, parseInt(e.target.value) || 1))
                }
                placeholder="bijv. 28"
                className="w-28 border-2 border-black px-3 py-2 text-sm font-bold outline-none focus:bg-[#fdf4c4] transition-colors"
              />
            </div>

          </div>
          </div>
            {classSize !== null && classSize > 0 && (
              <div className="flex flex-col gap-0.5">
                {Array.from({ length: Math.ceil(Math.min(classSize, 35) / 6) }).map((_, row) => (
                  <div key={row} className="flex gap-0.5">
                    {Array.from({ length: Math.min(6, Math.min(classSize, 35) - row * 6) }).map((_, col) => (
                      <User key={col} className="w-5 h-5 text-black/70" strokeWidth={1.5} />
                    ))}
                  </div>
                ))}
                {classSize > 35 && (
                  <span className="text-[10px] font-black text-black/40 mt-0.5">+{classSize - 35} meer</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-2 border-black bg-white p-5">
          <p className="text-xs font-black uppercase tracking-widest mb-3">Moeilijkheidsgraad klas</p>
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
                  "flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold border-2 transition-all text-left",
                  classDifficulty === d
                    ? d === "Groen"
                      ? "bg-green-500 border-green-700 text-white"
                      : d === "Oranje"
                      ? "bg-orange-400 border-orange-600 text-white"
                      : "bg-red-500 border-red-700 text-white"
                    : "border-black bg-white hover:bg-[#fdf4c4]"
                )}
              >
                <span
                  className={cn(
                    "w-3 h-3 rounded-full flex-shrink-0 border",
                    d === "Groen"
                      ? classDifficulty === d ? "bg-white border-white/50" : "bg-green-500 border-green-700"
                      : d === "Oranje"
                      ? classDifficulty === d ? "bg-white border-white/50" : "bg-orange-400 border-orange-600"
                      : classDifficulty === d ? "bg-white border-white/50" : "bg-red-500 border-red-700"
                  )}
                />
                <span className="font-black">{d}</span>
                <span className={cn("text-xs font-medium", classDifficulty === d ? "text-white/80" : "text-black/50")}>
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
