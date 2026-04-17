import type { ReactNode } from "react"
import { ArrowRight, Plus } from "lucide-react"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { cn } from "~/lib/utils"
import { LEVELS, SCHOOL_YEARS, getDisabledYears, type ClassDifficulty, type Level, type SchoolYear } from "./types"

export interface ExistingClassOption {
  id: string
  name: string
  level: Level
  schoolYear: SchoolYear
  size: number
  difficulty: ClassDifficulty | null
  latestLesplanUpdatedAt: string | null
}

interface Props {
  existingClasses: ExistingClassOption[]
  availableLevels: Level[]
  showCreateForm: boolean
  selectedExistingClassId: string | null
  className_: string
  selectedLevel: Level | null
  selectedYear: SchoolYear | null
  classSize: number | null
  classDifficulty: ClassDifficulty | null
  onCreateNew: () => void
  onExistingClassSelect: (classId: string) => void
  onDeselectExistingClass: () => void
  onClassNameChange: (value: string) => void
  onLevelSelect: (level: Level) => void
  onYearSelect: (year: SchoolYear) => void
  onClassSizeChange: (value: number | null) => void
  onClassDifficultyChange: (value: ClassDifficulty) => void
  onConfirm: () => void
  canContinue: boolean
  classroomPicker?: ReactNode
  backLink?: ReactNode
}

export function Step1ClassSetup({
  existingClasses,
  availableLevels,
  showCreateForm,
  selectedExistingClassId,
  className_,
  selectedLevel,
  selectedYear,
  classSize,
  classDifficulty,
  onCreateNew,
  onExistingClassSelect,
  onDeselectExistingClass,
  onClassNameChange,
  onLevelSelect,
  onYearSelect,
  onClassSizeChange,
  onClassDifficultyChange,
  onConfirm,
  canContinue,
  classroomPicker,
  backLink,
}: Props) {
  const disabledYears = getDisabledYears(selectedLevel)
  const selectedExistingClass = selectedExistingClassId
    ? existingClasses.find((c) => c.id === selectedExistingClassId) ?? null
    : null

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          {backLink}
          <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-widest">
            Stap 1 van 3
          </Badge>
        </div>
        <h1 className="text-4xl font-bold mb-1.5 text-[#0b1c30]">Klasgegevens</h1>
        <p className="text-sm text-[#464554]">Stel je klas in voordat je je vakmateriaal kiest.</p>
      </div>

      {selectedExistingClass ? (
        /* ── Selected existing class: show summary + classroom picker ── */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-3">Geselecteerde klas</p>
            <div className="rounded-xl px-4 py-3 border border-[#2a14b4] bg-[#eff4ff] shadow-[0px_4px_12px_rgba(42,20,180,0.12)]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#0b1c30]">{selectedExistingClass.name}</p>
                <button
                  onClick={onDeselectExistingClass}
                  className="text-xs font-semibold text-[#5c5378] hover:text-[#2a14b4] transition-colors"
                >
                  Wijzigen
                </button>
              </div>
              <p className="mt-1 text-xs text-[#464554]">
                {selectedExistingClass.level} · {selectedExistingClass.schoolYear} · {selectedExistingClass.size} leerlingen
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    selectedExistingClass.difficulty === "Groen"
                      ? "bg-emerald-500"
                      : selectedExistingClass.difficulty === "Oranje"
                      ? "bg-orange-400"
                      : selectedExistingClass.difficulty === "Rood"
                      ? "bg-red-500"
                      : "bg-[#a6abc0]"
                  )}
                />
                <span className="text-[11px] font-semibold text-[#464554]">{selectedExistingClass.difficulty ?? "Onbekend"}</span>
              </div>
            </div>
          </div>

          {classroomPicker}

          <div className="mt-8">
            <Button disabled={!canContinue} className="gap-2" onClick={onConfirm}>
              Volgende stap
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : !showCreateForm && existingClasses.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-3">Bestaande klassen</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {existingClasses.map((existingClass) => (
                <button
                  key={existingClass.id}
                  onClick={() => onExistingClassSelect(existingClass.id)}
                  className="rounded-xl px-4 py-3 text-left transition-all border border-[#e6e8f3] bg-[#f8f9ff] hover:bg-[#eff4ff]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#0b1c30]">{existingClass.name}</p>
                    {existingClass.latestLesplanUpdatedAt && (
                      <span className="text-[11px] text-[#5c5378]/70">
                        Laatst: {new Date(existingClass.latestLesplanUpdatedAt).toLocaleDateString("nl-NL")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#464554]">
                    {existingClass.level} · {existingClass.schoolYear} · {existingClass.size} leerlingen
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        existingClass.difficulty === "Groen"
                          ? "bg-emerald-500"
                          : existingClass.difficulty === "Oranje"
                          ? "bg-orange-400"
                          : existingClass.difficulty === "Rood"
                          ? "bg-red-500"
                          : "bg-[#a6abc0]"
                      )}
                    />
                    <span className="text-[11px] font-semibold text-[#464554]">{existingClass.difficulty ?? "Onbekend"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Button className="gap-2" onClick={onCreateNew}>
              <Plus className="w-4 h-4" />
              Nieuwe klas
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {existingClasses.length > 0 && (
            <button
              onClick={onDeselectExistingClass}
              className="flex items-center gap-2 text-sm font-semibold text-[#5c5378] hover:text-[#2a14b4] transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Bestaande klas selecteren
            </button>
          )}
          <div className="bg-white rounded-2xl p-5 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-4">Klas basis</p>
            <label className="block mb-3">
              <span className="block text-xs font-medium text-[#464554] mb-1.5">Klasnaam</span>
              <input
                type="text"
                value={className_}
                onChange={(e) => onClassNameChange(e.target.value)}
                placeholder="bijv. 3H1, 2V-A, Klas 4"
                className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:font-normal placeholder:text-[#8a91a5]"
              />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-medium text-[#464554] mb-1.5">Niveau</span>
                <Select value={selectedLevel ?? undefined} onValueChange={(value) => onLevelSelect(value as Level)}>
                  <SelectTrigger className="h-10 rounded-xl border border-transparent bg-[#dce9ff] px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
                    <SelectValue placeholder="Kies een niveau" />
                  </SelectTrigger>
                  <SelectContent
                    className="rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
                    position="popper"
                  >
                    {(availableLevels.length > 0 ? availableLevels : LEVELS).map((level) => (
                      <SelectItem
                        key={level}
                        value={level}
                        className="rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#0b1c30] focus:bg-[#dce9ff] focus:text-[#0b1c30]"
                      >
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-[#464554] mb-1.5">Leerjaar</span>
                <Select value={selectedYear ?? undefined} onValueChange={(value) => onYearSelect(value as SchoolYear)}>
                  <SelectTrigger className="h-10 rounded-xl border border-[#a89eef] bg-[#dce9ff] px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
                    <SelectValue placeholder="Kies een Leerjaar" />
                  </SelectTrigger>
                  <SelectContent
                    className="rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
                    position="popper"
                  >
                    {SCHOOL_YEARS.map((year) => (
                      <SelectItem
                        key={year}
                        value={year}
                        disabled={disabledYears.includes(year)}
                        className="rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#0b1c30] focus:bg-[#dce9ff] focus:text-[#0b1c30] data-[disabled]:text-[#8a91a5]"
                      >
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
          </div>

        <div className="bg-white rounded-2xl p-5 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-4">Klasgrootte</p>
            <label className="block">
              <span className="block text-xs font-medium text-[#464554] mb-1.5">Aantal leerlingen</span>
              <input
                type="number"
                min={1}
                max={99}
                value={classSize ?? ""}
                onChange={(e) =>
                  onClassSizeChange(e.target.value === "" ? null : Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                placeholder="bijv. 24"
                className="w-full max-w-[200px] h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35"
              />
            </label>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-3">Klasdynamiek</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {(
              [
                { value: "Groen", description: "Goed hanteerbaar" },
                { value: "Oranje", description: "Vraagt extra aandacht" },
                { value: "Rood", description: "Intensieve begeleiding nodig" },
              ] as { value: ClassDifficulty; description: string }[]
            ).map(({ value, description }) => (
              <button
                key={value}
                onClick={() => onClassDifficultyChange(value)}
                className={cn(
                  "rounded-xl px-4 py-3 text-left transition-all border",
                  classDifficulty === value
                    ? value === "Groen"
                      ? "border-emerald-500 bg-emerald-50 shadow-[0px_6px_16px_rgba(16,185,129,0.2)]"
                      : value === "Oranje"
                      ? "border-orange-400 bg-[#fff1d8] shadow-[0px_6px_16px_rgba(251,146,60,0.2)]"
                      : "border-red-500 bg-red-50 shadow-[0px_6px_16px_rgba(239,68,68,0.2)]"
                    : "border-[#e6e8f3] bg-[#f8f9ff] hover:bg-[#eff4ff]"
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      value === "Groen" ? "bg-emerald-500" : value === "Oranje" ? "bg-orange-400" : "bg-red-500"
                    )}
                  />
                  <span className="text-sm font-semibold text-[#0b1c30]">{value}</span>
                </span>
                <p className="text-xs text-[#464554] mt-1">{description}</p>
              </button>
            ))}
          </div>
        </div>
          {classroomPicker}

          <div className="mt-8">
            <Button disabled={!canContinue} className="gap-2" onClick={onConfirm}>
              Volgende stap
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
