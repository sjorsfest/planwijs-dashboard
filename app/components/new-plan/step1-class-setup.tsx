import { ArrowRight } from "lucide-react"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { LEVELS, SCHOOL_YEARS, getDisabledYears, type Level, type SchoolYear } from "./types"

interface Props {
  selectedLevel: Level | null
  selectedYear: SchoolYear | null
  onLevelSelect: (level: Level) => void
  onYearSelect: (year: SchoolYear) => void
}

export function Step1ClassSetup({ selectedLevel, selectedYear, onLevelSelect, onYearSelect }: Props) {
  return (
    <>
      <div className="mb-8">
        <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest mb-1">
          Stap 1 van 6
        </Badge>
        <h1 className="text-4xl font-black mb-1">Nieuw lesplan</h1>
        <p className="text-sm text-black/60 font-medium">Stel eerst je klas in.</p>
      </div>

      <div className="space-y-6">
        <div className="border-2 border-black bg-white p-5">
          <p className="text-xs font-black uppercase tracking-widest mb-3">Niveau</p>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => onLevelSelect(level)}
                className={cn(
                  "px-4 py-2 text-sm font-bold border-2 border-black transition-all",
                  selectedLevel === level ? "bg-black text-white" : "bg-white hover:bg-[#fdf4c4]"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="border-2 border-black bg-white p-5">
          <p className="text-xs font-black uppercase tracking-widest mb-3">Schooljaar</p>
          <div className="flex flex-wrap gap-2">
            {SCHOOL_YEARS.map((year) => {
              const disabled = getDisabledYears(selectedLevel).includes(year)
              return (
                <button
                  key={year}
                  disabled={disabled}
                  onClick={() => !disabled && onYearSelect(year)}
                  className={cn(
                    "px-4 py-2 text-sm font-bold border-2 transition-all",
                    disabled
                      ? "border-black/20 bg-white text-black/25 cursor-not-allowed"
                      : selectedYear === year
                      ? "border-black bg-black text-white"
                      : "border-black bg-white hover:bg-[#fdf4c4]"
                  )}
                >
                  {year}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Button disabled={!selectedLevel || !selectedYear} className="gap-2">
          Volgende
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </>
  )
}
