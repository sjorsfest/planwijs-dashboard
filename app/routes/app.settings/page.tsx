import { useEffect, useRef, useState } from "react"
import { useFetcher, useLoaderData } from "react-router"
import { AnimatePresence, motion } from "framer-motion"
import { BookOpen, Check, Loader2, School, Search, X } from "lucide-react"
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
import type { loader, action } from "./route"
import type { SettingsActionData } from "./types"

export default function SettingsPage() {
  const { schoolConfig, userSubjects, allSubjects } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()
  const isSubmitting = fetcher.state !== "idle"
  const actionData = fetcher.data as SettingsActionData | undefined

  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(
    userSubjects.map((s) => s.id),
  )
  const [lessonDuration, setLessonDuration] = useState<number>(
    schoolConfig?.default_lesson_duration_minutes ?? 50,
  )
  const [selectedLevels, setSelectedLevels] = useState<Level[]>(
    (schoolConfig?.levels as Level[]) ?? [],
  )
  const [schoolType, setSchoolType] = useState<SchoolType | "">(
    schoolConfig?.school_type ?? "",
  )
  const [contextNotes, setContextNotes] = useState<string>(
    schoolConfig?.context_notes ?? "",
  )
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (actionData?.ok) {
      setSaved(true)
      const timeout = setTimeout(() => setSaved(false), 2500)
      return () => clearTimeout(timeout)
    }
  }, [actionData])

  const subjectsByCategory = allSubjects.reduce(
    (acc, subject) => {
      const cat = subject.category?.trim() || "Overig"
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(subject)
      return acc
    },
    {} as Record<string, typeof allSubjects>,
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

  function handleSave() {
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
    fetcher.submit(formData, { method: "POST" })
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#0b1c30]">Instellingen</h1>
        <p className="text-sm text-[#464554] mt-1.5">
          Beheer je schoolinstellingen en vakken.
        </p>
      </div>

      <div className="space-y-6">
        {/* Subjects - searchable multi-select */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2a14b4] to-[#4338ca] flex items-center justify-center shadow-[0px_4px_12px_rgba(42,20,180,0.2)] flex-shrink-0">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0b1c30]">Mijn vakken</p>
              <p className="text-xs text-[#464554]">Zoek en selecteer de vakken die je geeft.</p>
            </div>
          </div>

          <SubjectMultiSelect
            allSubjects={allSubjects}
            sortedCategories={sortedCategories}
            subjectsByCategory={subjectsByCategory}
            selectedSubjectIds={selectedSubjectIds}
            onToggleSubject={toggleSubject}
          />
        </motion.div>

        {/* Lesson Duration + Levels grouped */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white rounded-2xl p-6 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2a14b4] to-[#4338ca] flex items-center justify-center shadow-[0px_4px_12px_rgba(42,20,180,0.2)] flex-shrink-0">
              <School className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0b1c30]">Schoolinstellingen</p>
              <p className="text-xs text-[#464554]">Lesduur, niveaus, schooltype en context.</p>
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
                    onClick={() => setLessonDuration(min)}
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
                    setLessonDuration(
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
                      onClick={() => toggleLevel(level)}
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

            {/* School type + context */}
            <div className="bg-[#f8f9ff] rounded-xl p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-2.5">
                  Schooltype
                </p>
                <Select value={schoolType} onValueChange={(v) => setSchoolType(v as SchoolType)}>
                  <SelectTrigger className="h-10 rounded-xl border border-transparent bg-white px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
                    <SelectValue placeholder="Kies een schooltype" />
                  </SelectTrigger>
                  <SelectContent
                    className="rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
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
                  rows={3}
                  value={contextNotes}
                  onChange={(e) => setContextNotes(e.target.value)}
                  placeholder="Bijv. wij zijn een school met focus op zelfstandig leren..."
                  className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:text-[#8a91a5] resize-none"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex items-center gap-3"
        >
          <Button onClick={handleSave} disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Opslaan...
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4" />
                Opgeslagen
              </>
            ) : (
              "Opslaan"
            )}
          </Button>

          {actionData && !actionData.ok && actionData.error && (
            <p className="text-sm font-medium text-red-600">{actionData.error}</p>
          )}
        </motion.div>
      </div>
    </div>
  )
}

/* ─── Subject Multi-Select ─────────────────────────────────── */

function SubjectMultiSelect({
  allSubjects,
  sortedCategories,
  subjectsByCategory,
  selectedSubjectIds,
  onToggleSubject,
}: {
  allSubjects: Subject[]
  sortedCategories: string[]
  subjectsByCategory: Record<string, Subject[]>
  selectedSubjectIds: string[]
  onToggleSubject: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedSubjects = allSubjects.filter((s) => selectedSubjectIds.includes(s.id))
  const normalizedQuery = query.trim().toLowerCase()

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
    <div className="mt-4">
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
              className="absolute z-10 left-0 right-0 mt-1.5 bg-white rounded-xl shadow-[0px_20px_32px_rgba(11,28,48,0.18)] border border-[#c7d6f5] overflow-hidden"
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

      {/* Selected count */}
      <p className="text-xs text-[#464554] mt-2.5">
        {selectedSubjectIds.length === 0 ? (
          <span className="text-[#8a91a5]">Geen vakken geselecteerd</span>
        ) : (
          <>
            <span className="font-semibold text-[#2a14b4]">{selectedSubjectIds.length}</span>
            {" "}
            {selectedSubjectIds.length === 1 ? "vak" : "vakken"} geselecteerd
          </>
        )}
      </p>
    </div>
  )
}
