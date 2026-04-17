import { useEffect, useRef, useState } from "react"
import { useFetcher, useRevalidator } from "react-router"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, BookOpen, Check, Loader2, School, Search, X } from "lucide-react"
import { getSubjectIcon } from "~/lib/subject-metadata"
import { Button } from "~/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { SCHOOL_TYPES, SCHOOL_TYPE_LABELS, type SchoolType, type Subject } from "~/lib/backend/types"
import { LEVELS, type Level } from "~/components/new-plan/types"
import { cn } from "~/lib/utils"
import type { SettingsActionData } from "~/routes/app.settings/types"

const EASE = [0.22, 1, 0.36, 1] as const

export function SchoolConfigOnboarding() {
  const fetcher = useFetcher<SettingsActionData>()
  const revalidator = useRevalidator()
  const subjectsFetcher = useFetcher<Subject[]>()

  const isSubmitting = fetcher.state !== "idle"

  const [step, setStep] = useState<1 | 2>(1)
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const [lessonDuration, setLessonDuration] = useState<number>(50)
  const [selectedLevels, setSelectedLevels] = useState<Level[]>([])
  const [schoolType, setSchoolType] = useState<SchoolType>("REGULIER")
  const [contextNotes, setContextNotes] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Prevent background scrolling while overlay is visible
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  useEffect(() => {
    if (subjectsFetcher.state === "idle" && !subjectsFetcher.data) {
      subjectsFetcher.load("/api/subjects")
    }
  }, [subjectsFetcher])

  useEffect(() => {
    const result = fetcher.data
    if (result?.ok) {
      revalidator.revalidate()
    } else if (result && !result.ok && result.error) {
      setError(result.error)
    }
  }, [fetcher.data, revalidator])

  const allSubjects = subjectsFetcher.data ?? []

  const subjectsByCategory = allSubjects.reduce(
    (acc, subject) => {
      const cat = subject.category?.trim() || "Overig"
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(subject)
      return acc
    },
    {} as Record<string, Subject[]>,
  )

  const sortedCategories = Object.keys(subjectsByCategory).sort((a, b) =>
    a.localeCompare(b, "nl"),
  )

  function toggleSubject(id: string) {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  function toggleLevel(level: Level) {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    )
  }

  const step1Valid = selectedSubjectIds.length > 0
  const step2Valid = lessonDuration > 0 && selectedLevels.length > 0 && !!schoolType

  function handleSubmit() {
    if (!step1Valid || !step2Valid) return
    setError(null)

    const formData = new FormData()
    formData.set("_action", "updateAll")
    formData.set(
      "configBody",
      JSON.stringify({
        default_lesson_duration_minutes: lessonDuration,
        levels: selectedLevels,
        school_type: schoolType || null,
        context_notes: contextNotes.trim() || null,
      }),
    )
    formData.set("subjectIds", JSON.stringify(selectedSubjectIds))
    fetcher.submit(formData, { method: "POST", action: "/settings" })
  }

  const selectedSubjectNames = allSubjects
    .filter((s) => selectedSubjectIds.includes(s.id))
    .map((s) => s.name)

  return (
    <AnimatePresence>
      <motion.div
        key="config-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="w-full max-w-xl bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] my-8"
        >
          {/* Progress bar */}
          <div className="h-1 bg-[#eff4ff] rounded-t-2xl overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#2a14b4] to-[#4338ca]"
              initial={{ width: "50%" }}
              animate={{ width: step === 1 ? "50%" : "100%" }}
              transition={{ duration: 0.4, ease: EASE }}
            />
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <Step1Subjects
                  subjectsLoading={subjectsFetcher.state === "loading"}
                  allSubjects={allSubjects}
                  sortedCategories={sortedCategories}
                  subjectsByCategory={subjectsByCategory}
                  selectedSubjectIds={selectedSubjectIds}
                  onToggleSubject={toggleSubject}
                  isValid={step1Valid}
                  onNext={() => setStep(2)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <Step2SchoolInfo
                  selectedSubjectNames={selectedSubjectNames}
                  lessonDuration={lessonDuration}
                  onLessonDurationChange={setLessonDuration}
                  selectedLevels={selectedLevels}
                  onToggleLevel={toggleLevel}
                  schoolType={schoolType}
                  onSchoolTypeChange={(v) => setSchoolType(v as SchoolType)}
                  contextNotes={contextNotes}
                  onContextNotesChange={setContextNotes}
                  isValid={step2Valid}
                  isSubmitting={isSubmitting}
                  error={error}
                  onBack={() => setStep(1)}
                  onSubmit={handleSubmit}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ─── Step 1: Subjects ───────────────────────────────────────── */

function Step1Subjects({
  subjectsLoading,
  allSubjects,
  sortedCategories,
  subjectsByCategory,
  selectedSubjectIds,
  onToggleSubject,
  isValid,
  onNext,
}: {
  subjectsLoading: boolean
  allSubjects: Subject[]
  sortedCategories: string[]
  subjectsByCategory: Record<string, Subject[]>
  selectedSubjectIds: string[]
  onToggleSubject: (id: string) => void
  isValid: boolean
  onNext: () => void
}) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedSubjects = allSubjects.filter((s) => selectedSubjectIds.includes(s.id))
  const normalizedQuery = query.trim().toLowerCase()

  // Filter subjects by search query, grouped by category
  const filteredCategories = normalizedQuery
    ? sortedCategories
        .map((cat) => ({
          name: cat,
          subjects: subjectsByCategory[cat].filter((s) =>
            s.name.toLowerCase().includes(normalizedQuery),
          ),
        }))
        .filter((cat) => cat.subjects.length > 0)
    : sortedCategories.map((cat) => ({ name: cat, subjects: subjectsByCategory[cat] }))

  const totalResults = filteredCategories.reduce((sum, cat) => sum + cat.subjects.length, 0)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="px-7 pb-7 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-1">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2a14b4] to-[#4338ca] flex items-center justify-center shadow-[0px_6px_16px_rgba(42,20,180,0.25)] flex-shrink-0">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#464554]/50">
            Stap 1 van 2
          </p>
          <h1 className="text-xl font-bold text-[#0b1c30] tracking-[-0.02em]">
            Welke vakken geef je les?
          </h1>
        </div>
      </div>
      <p className="text-sm text-[#464554] leading-relaxed mt-2 mb-5">
        Zoek en selecteer je vakken zodat we de juiste methodes voor je klaarzetten.
      </p>

      {subjectsLoading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-[#464554] py-12">
          <Loader2 className="w-4 h-4 animate-spin" />
          Vakken laden...
        </div>
      ) : (
        <>
          {/* Selected subjects as badges */}
          {selectedSubjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedSubjects.map((subject) => {
                const Icon = getSubjectIcon(subject.name)
                return (
                  <motion.button
                    key={subject.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => onToggleSubject(subject.id)}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-lg bg-[#2a14b4] text-white text-xs font-semibold transition-all hover:bg-[#4338ca]"
                  >
                    <Icon className="w-3.5 h-3.5 opacity-80" />
                    {subject.name}
                    <X className="w-3 h-3 opacity-70" />
                  </motion.button>
                )
              })}
            </div>
          )}

          {/* Search input + dropdown */}
          <div ref={containerRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a91a5] pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setIsOpen(true)
                }}
                onFocus={() => setIsOpen(true)}
                placeholder="Zoek een vak..."
                className="w-full h-11 rounded-xl bg-[#f8f9ff] pl-10 pr-3 text-sm text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:text-[#8a91a5] transition-all"
              />
            </div>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-10 left-0 right-0 mt-1.5 bg-white rounded-xl shadow-[0px_20px_32px_rgba(11,28,48,0.18)] overflow-hidden"
                >
                  <div className="max-h-[280px] overflow-y-auto p-1.5">
                    {totalResults === 0 ? (
                      <p className="text-sm text-[#8a91a5] text-center py-6">
                        Geen vakken gevonden
                      </p>
                    ) : (
                      filteredCategories.map((category) => (
                        <div key={category.name}>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#464554]/40 px-2.5 pt-2.5 pb-1">
                            {category.name}
                          </p>
                          {category.subjects.map((subject) => {
                            const isSelected = selectedSubjectIds.includes(subject.id)
                            const SubjectIcon = getSubjectIcon(subject.name)
                            return (
                              <button
                                key={subject.id}
                                onClick={() => {
                                  onToggleSubject(subject.id)
                                  setQuery("")
                                  inputRef.current?.focus()
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition-colors",
                                  isSelected
                                    ? "bg-[#eff4ff] text-[#2a14b4] font-semibold"
                                    : "text-[#0b1c30] hover:bg-[#f8f9ff]",
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  <SubjectIcon className={cn("w-4 h-4 flex-shrink-0", isSelected ? "text-[#2a14b4]" : "text-[#8a91a5]")} />
                                  {subject.name}
                                </span>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-[#2a14b4] flex-shrink-0" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Selected count + next */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-[#464554]">
          {selectedSubjectIds.length === 0 ? (
            <span className="text-[#8a91a5]">Selecteer minimaal 1 vak</span>
          ) : (
            <>
              <span className="font-semibold text-[#2a14b4]">{selectedSubjectIds.length}</span>
              {" "}
              {selectedSubjectIds.length === 1 ? "vak" : "vakken"} geselecteerd
            </>
          )}
        </p>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="gap-2"
        >
          Volgende
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

/* ─── Step 2: School info ─────────────────────────────────────── */

function Step2SchoolInfo({
  selectedSubjectNames,
  lessonDuration,
  onLessonDurationChange,
  selectedLevels,
  onToggleLevel,
  schoolType,
  onSchoolTypeChange,
  contextNotes,
  onContextNotesChange,
  isValid,
  isSubmitting,
  error,
  onBack,
  onSubmit,
}: {
  selectedSubjectNames: string[]
  lessonDuration: number
  onLessonDurationChange: (v: number) => void
  selectedLevels: Level[]
  onToggleLevel: (l: Level) => void
  schoolType: SchoolType
  onSchoolTypeChange: (v: string) => void
  contextNotes: string
  onContextNotesChange: (v: string) => void
  isValid: boolean
  isSubmitting: boolean
  error: string | null
  onBack: () => void
  onSubmit: () => void
}) {
  return (
    <div className="px-7 pb-7 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-1">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2a14b4] to-[#4338ca] flex items-center justify-center shadow-[0px_6px_16px_rgba(42,20,180,0.25)] flex-shrink-0">
          <School className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#464554]/50">
            Stap 2 van 2
          </p>
          <h1 className="text-xl font-bold text-[#0b1c30] tracking-[-0.02em]">
            Over je school en lessen
          </h1>
        </div>
      </div>

      {/* Selected subjects summary */}
      <div className="mt-3 mb-5">
        <div className="flex flex-wrap gap-1.5">
          {selectedSubjectNames.map((name) => {
            const Icon = getSubjectIcon(name)
            return (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2a14b4]/8 text-[#2a14b4] text-xs font-semibold"
              >
                <Icon className="w-3.5 h-3.5" />
                {name}
              </span>
            )
          })}
          <button
            onClick={onBack}
            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-[#5c5378] hover:bg-[#eff4ff] transition-colors"
          >
            Wijzigen
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Lesson duration */}
        <div className="bg-[#f8f9ff] rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-2.5">
            Standaard lesduur
          </p>
          <div className="flex flex-wrap gap-2">
            {[45, 50, 60, 90].map((min) => (
              <button
                key={min}
                onClick={() => onLessonDurationChange(min)}
                className={cn(
                  "px-3.5 py-2 text-sm font-semibold rounded-xl transition-all",
                  lessonDuration === min
                    ? "bg-[#2a14b4] text-white shadow-[0px_4px_12px_rgba(42,20,180,0.2)]"
                    : "bg-white text-[#0b1c30] hover:bg-[#eff4ff]",
                )}
              >
                {min} min
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={240}
              value={![45, 50, 60, 90].includes(lessonDuration) ? lessonDuration : ""}
              onChange={(e) =>
                onLessonDurationChange(
                  e.target.value === "" ? 50 : Math.max(1, parseInt(e.target.value) || 50),
                )
              }
              placeholder="Anders"
              className="w-20 bg-white rounded-xl px-3 py-2 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/40 transition-all placeholder:font-normal placeholder:text-[#8a91a5]"
            />
          </div>
        </div>

        {/* Levels */}
        <div className="bg-[#f8f9ff] rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-2.5">
            School Niveau(s)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((level) => {
              const isSelected = selectedLevels.includes(level)
              return (
                <button
                  key={level}
                  onClick={() => onToggleLevel(level)}
                  className={cn(
                    "px-3.5 py-2 text-sm font-semibold rounded-xl transition-all",
                    isSelected
                      ? "bg-[#2a14b4] text-white shadow-[0px_4px_12px_rgba(42,20,180,0.2)]"
                      : "bg-white text-[#0b1c30] hover:bg-[#eff4ff]",
                  )}
                >
                  {level}
                </button>
              )
            })}
          </div>
        </div>

        {/* School type + context grouped */}
        <div className="bg-[#f8f9ff] rounded-xl p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-2.5">
              Schooltype
            </p>
            <Select value={schoolType} onValueChange={onSchoolTypeChange}>
              <SelectTrigger className="h-10 rounded-xl border border-transparent bg-white px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
                <SelectValue placeholder="Kies een schooltype" />
              </SelectTrigger>
              <SelectContent
                className="z-[70] rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
                position="popper"
              >
                {SCHOOL_TYPES.map((type) => (
                  <SelectItem
                    key={type}
                    value={type}
                    className="rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#0b1c30] focus:bg-[#dce9ff] focus:text-[#0b1c30]"
                  >
                    {SCHOOL_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-2.5">
              Schoolcontext
              <span className="ml-1.5 normal-case tracking-normal font-normal text-[#8a91a5]">optioneel</span>
            </p>
            <textarea
              rows={2}
              value={contextNotes}
              onChange={(e) => onContextNotesChange(e.target.value)}
              placeholder="Bijv. wij zijn een school met focus op zelfstandig leren..."
              className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:text-[#8a91a5] resize-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm font-semibold text-[#5c5378] hover:text-[#2a14b4] transition-colors px-3 py-2"
        >
          Terug
        </button>
        <Button
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Opslaan...
            </>
          ) : (
            "Aan de slag"
          )}
        </Button>
      </div>
    </div>
  )
}
