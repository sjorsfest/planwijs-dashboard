import { useState } from "react"
import { useLoaderData, useFetcher, Link } from "react-router"
import {
  Users,
  Pencil,
  Trash2,
  X,
  Check,
  Sparkles,
  Clock,
  CircleHelp,
  ChevronDown,
  ChevronUp,
  MapPin,
  Plus,
} from "lucide-react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import type { Class, Classroom } from "~/lib/backend/types"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { SubjectIcon } from "~/components/ui/subject-badge"
import {
  LEVELS,
  SCHOOL_YEARS,
  getDisabledYears,
  type Level,
  type SchoolYear,
  type ClassDifficulty,
  type ClassSupportChallenge,
} from "~/components/new-plan/types"
import { cn } from "~/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs"
import type { loader } from "./route"
import {
  DIFFICULTY_OPTIONS,
  AI_IMPACT_ITEMS,
  FIELD_HINTS,
  SOFT_EASE,
  SUBTLE_EASE,
  SUBTLE_LAYOUT_TRANSITION,
  PRESET_ASSETS,
  SUBJECTS,
  type FieldHintContent,
} from "./constants"

export default function ClassesPage() {
  const { classes, classrooms } = useLoaderData<typeof loader>()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const selectedId = editingId
  const orderedClasses = selectedId
    ? [
        ...classes.filter((cls) => cls.id === selectedId),
        ...classes.filter((cls) => cls.id !== selectedId),
      ]
    : classes
  const focusedClass = editingId ? orderedClasses.find((cls) => cls.id === editingId) ?? null : null
  const classesToRender = focusedClass ? [focusedClass] : orderedClasses
  const isFocusedEditView = focusedClass !== null

  function closeEditor() {
    setEditingId(null)
  }

  function startEditor(classId: string) {
    setEditingId(classId)
  }

  const [creatingClass, setCreatingClass] = useState(false)

  // Classroom editing state
  const [creatingClassroom, setCreatingClassroom] = useState(false)
  const [editingClassroomId, setEditingClassroomId] = useState<string | null>(null)
  const [deletingClassroomId, setDeletingClassroomId] = useState<string | null>(null)
  const orderedClassrooms = editingClassroomId
    ? [
        ...classrooms.filter((cr) => cr.id === editingClassroomId),
        ...classrooms.filter((cr) => cr.id !== editingClassroomId),
      ]
    : classrooms
  const focusedClassroom = editingClassroomId
    ? orderedClassrooms.find((cr) => cr.id === editingClassroomId) ?? null
    : null
  const classroomsToRender = focusedClassroom ? [focusedClassroom] : orderedClassrooms
  const isFocusedClassroomEditView = focusedClassroom !== null

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[#0b1c30] tracking-tight">
          Klassenoverzicht
        </h1>
        <p className="text-sm text-[#464554] mt-1.5">
          Beheer je klassen, lokalen en hun profielen. Deze gegevens bepalen hoe de AI je lesplannen op maat maakt.
        </p>
      </div>

      <Tabs defaultValue="klassen">
        <TabsList>
          <TabsTrigger value="klassen" className="gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Klassen
          </TabsTrigger>
          <TabsTrigger value="lokalen" className="gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            Lokalen
          </TabsTrigger>
        </TabsList>

        {/* ── Klassen tab ── */}
        <TabsContent value="klassen">
          {classes.length === 0 ? (
            <EmptyClassesState />
          ) : (
            <LayoutGroup>
              <motion.div
                layout
                transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
                className={cn(
                  "grid gap-4",
                  isFocusedEditView
                    ? "grid-cols-1 max-w-3xl"
                    : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                )}
              >
                {classesToRender.map((cls) => (
                  <motion.div
                    key={cls.id}
                    layout
                    transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
                    className={cn(
                      isFocusedEditView && editingId === cls.id && "col-start-1 row-start-1"
                    )}
                  >
                    <ClassCard
                      cls={cls}
                      isEditing={editingId === cls.id}
                      isDeleting={deletingId === cls.id}
                      onEdit={() => {
                        if (editingId === cls.id) {
                          closeEditor()
                        } else {
                          startEditor(cls.id!)
                        }
                      }}
                      onCancelEdit={closeEditor}
                      onDelete={() => setDeletingId(cls.id!)}
                      onCancelDelete={() => setDeletingId(null)}
                      onSaved={closeEditor}
                    />
                  </motion.div>
                ))}
                {!isFocusedEditView && (
                  <CreateClassCard
                    isCreating={creatingClass}
                    onToggle={() => setCreatingClass(!creatingClass)}
                    onCreated={() => setCreatingClass(false)}
                  />
                )}
              </motion.div>
            </LayoutGroup>
          )}
        </TabsContent>

        {/* ── Lokalen tab ── */}
        <TabsContent value="lokalen">
          {classrooms.length === 0 ? (
            <EmptyClassroomsState />
          ) : (
            <LayoutGroup id="classrooms">
              <motion.div
                layout
                transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
                className={cn(
                  "grid gap-4",
                  isFocusedClassroomEditView
                    ? "grid-cols-1 max-w-3xl"
                    : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                )}
              >
                {classroomsToRender.map((classroom) => (
                  <motion.div
                    key={classroom.id}
                    layout
                    transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
                    className={cn(
                      isFocusedClassroomEditView && editingClassroomId === classroom.id && "col-start-1 row-start-1"
                    )}
                  >
                    <ClassroomCard
                      classroom={classroom}
                      isEditing={editingClassroomId === classroom.id}
                      isDeleting={deletingClassroomId === classroom.id}
                      onEdit={() => {
                        if (editingClassroomId === classroom.id) {
                          setEditingClassroomId(null)
                        } else {
                          setEditingClassroomId(classroom.id!)
                        }
                      }}
                      onCancelEdit={() => setEditingClassroomId(null)}
                      onDelete={() => setDeletingClassroomId(classroom.id!)}
                      onCancelDelete={() => setDeletingClassroomId(null)}
                      onSaved={() => setEditingClassroomId(null)}
                    />
                  </motion.div>
                ))}
                {!isFocusedClassroomEditView && (
                  <CreateClassroomCard
                    isCreating={creatingClassroom}
                    onToggle={() => setCreatingClassroom(!creatingClassroom)}
                    onCreated={() => setCreatingClassroom(false)}
                  />
                )}
              </motion.div>
            </LayoutGroup>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Empty State ─────────────────────────────────────────────

function EmptyClassesState() {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState("")
  const [subject, setSubject] = useState<string>("Nederlands")
  const [level, setLevel] = useState<Level>("Havo")
  const [schoolYear, setSchoolYear] = useState<SchoolYear>("1e jaar")
  const [size, setSize] = useState<number>(25)
  const [classNotes, setClassNotes] = useState("")

  const disabledYears = getDisabledYears(level)

  function handleCreate() {
    if (!name.trim()) return
    const body = {
      name: name.trim(),
      subject,
      level,
      school_year: schoolYear,
      size,
      class_notes: classNotes.trim() || null,
    }
    const formData = new FormData()
    formData.set("_action", "create")
    formData.set("body", JSON.stringify(body))
    fetcher.submit(formData, { method: "POST" })
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] flex items-center justify-center">
          <Users className="w-6 h-6 text-[#5c5378]" />
        </div>
        <div>
          <p className="font-semibold text-base text-[#0b1c30]">Nog geen klassen</p>
          <p className="text-sm text-[#464554] mt-1">
            Maak een klas aan om je lesplannen op maat te laten genereren.
          </p>
        </div>

        {!showForm && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nieuwe klas aanmaken
            </Button>
            <Link
              to="/lesplan/new"
              prefetch="intent"
              className="text-xs text-[#5c5378] hover:text-[#2a14b4] transition-colors"
            >
              Of start een lesplan (klas wordt automatisch aangemaakt)
            </Link>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.4, ease: SUBTLE_EASE },
              opacity: { duration: 0.25, ease: SOFT_EASE },
            }}
            className="overflow-hidden"
          >
            <div className="mt-6 pt-6 border-t border-[#eff4ff] space-y-4 max-w-lg mx-auto">
              {/* Name */}
              <label className="block">
                <span className="block text-xs font-medium text-[#464554] mb-1.5">Klasnaam</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="bijv. 3H1, 2V-A, Klas 4"
                  className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:font-normal placeholder:text-[#8a91a5]"
                  autoFocus
                />
              </label>

              {/* Subject */}
              <label className="block">
                <span className="block text-xs font-medium text-[#464554] mb-1.5">Vak</span>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="h-10 rounded-xl border border-transparent bg-[#dce9ff] px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    className="rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
                    position="popper"
                  >
                    {SUBJECTS.map((s) => (
                      <SelectItem
                        key={s}
                        value={s}
                        className="rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#0b1c30] focus:bg-[#dce9ff] focus:text-[#0b1c30]"
                      >
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              {/* Level & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-medium text-[#464554] mb-1.5">Niveau</span>
                  <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
                    <SelectTrigger className="h-10 rounded-xl border border-transparent bg-[#dce9ff] px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      className="rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
                      position="popper"
                    >
                      {LEVELS.map((l) => (
                        <SelectItem
                          key={l}
                          value={l}
                          className="rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#0b1c30] focus:bg-[#dce9ff] focus:text-[#0b1c30]"
                        >
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-[#464554] mb-1.5">Schooljaar</span>
                  <Select value={schoolYear} onValueChange={(v) => setSchoolYear(v as SchoolYear)}>
                    <SelectTrigger className="h-10 rounded-xl border border-transparent bg-[#dce9ff] px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      className="rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
                      position="popper"
                    >
                      {SCHOOL_YEARS.map((y) => (
                        <SelectItem
                          key={y}
                          value={y}
                          disabled={disabledYears.includes(y)}
                          className="rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#0b1c30] focus:bg-[#dce9ff] focus:text-[#0b1c30] data-[disabled]:text-[#8a91a5]"
                        >
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>

              {/* Size */}
              <label className="block">
                <span className="block text-xs font-medium text-[#464554] mb-1.5">Aantal leerlingen</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={size}
                  onChange={(e) => setSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35"
                />
              </label>

              {/* Class notes */}
              <label className="block">
                <span className="block text-xs font-medium text-[#464554] mb-1.5">Klasnotities</span>
                <textarea
                  rows={3}
                  value={classNotes}
                  onChange={(e) => setClassNotes(e.target.value)}
                  placeholder="Bijv. de klas is energiek maar gemotiveerd, veel verschil in niveau..."
                  className="w-full rounded-xl bg-[#dce9ff] px-3 py-2.5 text-sm text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:text-[#8a91a5] resize-none"
                />
              </label>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={handleCreate}
                  disabled={isSubmitting || !name.trim()}
                  className="gap-1.5 text-sm"
                >
                  <Check className="w-4 h-4" />
                  Klas aanmaken
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  disabled={isSubmitting}
                  className="text-sm"
                >
                  Annuleren
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Empty Classrooms State ──────────────────────────────────

function EmptyClassroomsState() {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState("")
  const [assets, setAssets] = useState<string[]>([])
  const [customAsset, setCustomAsset] = useState("")
  const [showPresets, setShowPresets] = useState(false)

  const availablePresets = PRESET_ASSETS.filter((p) => !assets.includes(p))

  function addAsset(asset: string) {
    const trimmed = asset.trim()
    if (trimmed && !assets.includes(trimmed)) {
      setAssets((prev) => [...prev, trimmed])
    }
  }

  function removeAsset(asset: string) {
    setAssets((prev) => prev.filter((a) => a !== asset))
  }

  function handleCustomAssetKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      if (customAsset.trim()) {
        addAsset(customAsset)
        setCustomAsset("")
      }
    }
    if (e.key === "Backspace" && customAsset === "" && assets.length > 0) {
      setAssets((prev) => prev.slice(0, -1))
    }
  }

  function handleCreate() {
    if (!name.trim()) return
    const body = { name: name.trim(), assets }
    const formData = new FormData()
    formData.set("_action", "createClassroom")
    formData.set("body", JSON.stringify(body))
    fetcher.submit(formData, { method: "POST" })
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#e6f7f7] flex items-center justify-center">
          <MapPin className="w-6 h-6 text-[#0d7377]" />
        </div>
        <div>
          <p className="font-semibold text-base text-[#0b1c30]">Nog geen lokalen</p>
          <p className="text-sm text-[#464554] mt-1">
            Voeg een lokaal toe zodat de AI rekening kan houden met beschikbare middelen.
          </p>
        </div>

        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2 mt-2">
            <Plus className="w-4 h-4" />
            Nieuw lokaal aanmaken
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.4, ease: SUBTLE_EASE },
              opacity: { duration: 0.25, ease: SOFT_EASE },
            }}
            className="overflow-hidden"
          >
            <div className="mt-6 pt-6 border-t border-[#eff4ff] space-y-4 max-w-lg mx-auto">
              {/* Name */}
              <label className="block">
                <span className="block text-xs font-medium text-[#464554] mb-1.5">Naam lokaal</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="bijv. Lokaal 204, Science Lab"
                  className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:font-normal placeholder:text-[#8a91a5]"
                  autoFocus
                />
              </label>

              {/* Assets */}
              <div>
                <span className="block text-xs font-medium text-[#464554] mb-1.5">
                  Beschikbare middelen
                </span>

                <div
                  className="min-h-[44px] rounded-xl bg-[#dce9ff] px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-[#2a14b4]/35"
                  onClick={() => document.getElementById("new-classroom-asset-input")?.focus()}
                >
                  {assets.map((asset) => (
                    <span
                      key={asset}
                      className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs font-semibold rounded-lg bg-[#2a14b4] text-white shadow-[0px_2px_6px_rgba(42,20,180,0.25)]"
                    >
                      {asset}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeAsset(asset)
                        }}
                        className="ml-0.5 p-0.5 rounded-md hover:bg-white/20 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="new-classroom-asset-input"
                    type="text"
                    value={customAsset}
                    onChange={(e) => setCustomAsset(e.target.value)}
                    onKeyDown={handleCustomAssetKeyDown}
                    onFocus={() => setShowPresets(true)}
                    onBlur={() => setTimeout(() => setShowPresets(false), 200)}
                    placeholder={assets.length === 0 ? "Typ of kies middelen..." : ""}
                    className="flex-1 min-w-[120px] bg-transparent text-sm font-medium text-[#0b1c30] outline-none placeholder:font-normal placeholder:text-[#8a91a5]"
                  />
                </div>

                {showPresets && availablePresets.length > 0 && (
                  <div className="mt-2 rounded-xl bg-[#f8f9ff] p-2 shadow-[0px_12px_24px_rgba(11,28,48,0.1)]">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8a91a5] px-2 pb-1.5">
                      Suggesties
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {availablePresets
                        .filter(
                          (p) =>
                            !customAsset.trim() ||
                            p.toLowerCase().includes(customAsset.toLowerCase())
                        )
                        .map((preset) => (
                          <button
                            key={preset}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              addAsset(preset)
                              setCustomAsset("")
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff] transition-all"
                          >
                            <Plus className="w-3 h-3 text-[#2a14b4]" />
                            {preset}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={handleCreate}
                  disabled={isSubmitting || !name.trim()}
                  className="gap-1.5 text-sm"
                >
                  <Check className="w-4 h-4" />
                  Lokaal aanmaken
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  disabled={isSubmitting}
                  className="text-sm"
                >
                  Annuleren
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Create Class Card ───────────────────────────────────────

function CreateClassCard({
  isCreating,
  onToggle,
  onCreated,
}: {
  isCreating: boolean
  onToggle: () => void
  onCreated: () => void
}) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"

  const [name, setName] = useState("")
  const [subject, setSubject] = useState<string>("Nederlands")
  const [level, setLevel] = useState<Level>("Havo")
  const [schoolYear, setSchoolYear] = useState<SchoolYear>("1e jaar")
  const [size, setSize] = useState<number>(25)
  const [classNotes, setClassNotes] = useState("")

  const disabledYears = getDisabledYears(level)

  function handleCreate() {
    if (!name.trim()) return
    const body = {
      name: name.trim(),
      subject,
      level,
      school_year: schoolYear,
      size,
      class_notes: classNotes.trim() || null,
    }
    const formData = new FormData()
    formData.set("_action", "create")
    formData.set("body", JSON.stringify(body))
    fetcher.submit(formData, { method: "POST" })
    setName("")
    setClassNotes("")
    onCreated()
  }

  if (!isCreating) {
    return (
      <button
        onClick={onToggle}
        className="rounded-2xl border-2 border-dashed border-[#d4daf0] bg-[#f8f9ff] hover:border-[#2a14b4]/30 hover:bg-[#eff4ff] transition-all flex flex-col items-center justify-center gap-2 py-10 cursor-pointer group"
      >
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
          <Plus className="w-4.5 h-4.5 text-[#5c5378] group-hover:text-[#2a14b4] transition-colors" />
        </div>
        <span className="text-sm font-medium text-[#5c5378] group-hover:text-[#2a14b4] transition-colors">
          Nieuwe klas
        </span>
      </button>
    )
  }

  return (
    <motion.div
      layout
      transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
      className="bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-hidden"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#0b1c30]">Nieuwe klas</p>
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5c5378] hover:bg-[#eff4ff] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-[#464554] mb-1.5">Klasnaam</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="bijv. 3H1, 2V-A, Klas 4"
            className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:font-normal placeholder:text-[#8a91a5]"
            autoFocus
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-[#464554] mb-1.5">Vak</span>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="h-10 rounded-xl border border-transparent bg-[#dce9ff] px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className="rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
              position="popper"
            >
              {SUBJECTS.map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  className="rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#0b1c30] focus:bg-[#dce9ff] focus:text-[#0b1c30]"
                >
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-[#464554] mb-1.5">Niveau</span>
            <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
              <SelectTrigger className="h-10 rounded-xl border border-transparent bg-[#dce9ff] px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                className="rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
                position="popper"
              >
                {LEVELS.map((l) => (
                  <SelectItem
                    key={l}
                    value={l}
                    className="rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#0b1c30] focus:bg-[#dce9ff] focus:text-[#0b1c30]"
                  >
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-[#464554] mb-1.5">Schooljaar</span>
            <Select value={schoolYear} onValueChange={(v) => setSchoolYear(v as SchoolYear)}>
              <SelectTrigger className="h-10 rounded-xl border border-transparent bg-[#dce9ff] px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                className="rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
                position="popper"
              >
                {SCHOOL_YEARS.map((y) => (
                  <SelectItem
                    key={y}
                    value={y}
                    disabled={disabledYears.includes(y)}
                    className="rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#0b1c30] focus:bg-[#dce9ff] focus:text-[#0b1c30] data-[disabled]:text-[#8a91a5]"
                  >
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-[#464554] mb-1.5">Aantal leerlingen</span>
          <input
            type="number"
            min={1}
            max={99}
            value={size}
            onChange={(e) => setSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-[#464554] mb-1.5">Klasnotities</span>
          <textarea
            rows={3}
            value={classNotes}
            onChange={(e) => setClassNotes(e.target.value)}
            placeholder="Bijv. de klas is energiek maar gemotiveerd, veel verschil in niveau..."
            className="w-full rounded-xl bg-[#dce9ff] px-3 py-2.5 text-sm text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:text-[#8a91a5] resize-none"
          />
        </label>

        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={handleCreate}
            disabled={isSubmitting || !name.trim()}
            className="gap-1.5 text-sm"
          >
            <Check className="w-4 h-4" />
            Klas aanmaken
          </Button>
          <Button
            variant="ghost"
            onClick={onToggle}
            disabled={isSubmitting}
            className="text-sm"
          >
            Annuleren
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Create Classroom Card ──────────────────────────────────

function CreateClassroomCard({
  isCreating,
  onToggle,
  onCreated,
}: {
  isCreating: boolean
  onToggle: () => void
  onCreated: () => void
}) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"

  const [name, setName] = useState("")
  const [assets, setAssets] = useState<string[]>([])
  const [customAsset, setCustomAsset] = useState("")
  const [showPresets, setShowPresets] = useState(false)

  const availablePresets = PRESET_ASSETS.filter((p) => !assets.includes(p))

  function addAsset(asset: string) {
    const trimmed = asset.trim()
    if (trimmed && !assets.includes(trimmed)) {
      setAssets((prev) => [...prev, trimmed])
    }
  }

  function removeAsset(asset: string) {
    setAssets((prev) => prev.filter((a) => a !== asset))
  }

  function handleCustomAssetKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      if (customAsset.trim()) {
        addAsset(customAsset)
        setCustomAsset("")
      }
    }
    if (e.key === "Backspace" && customAsset === "" && assets.length > 0) {
      setAssets((prev) => prev.slice(0, -1))
    }
  }

  function handleCreate() {
    if (!name.trim()) return
    const body = { name: name.trim(), assets }
    const formData = new FormData()
    formData.set("_action", "createClassroom")
    formData.set("body", JSON.stringify(body))
    fetcher.submit(formData, { method: "POST" })
    setName("")
    setAssets([])
    onCreated()
  }

  if (!isCreating) {
    return (
      <button
        onClick={onToggle}
        className="rounded-2xl border-2 border-dashed border-[#d4daf0] bg-[#f8f9ff] hover:border-[#0d7377]/30 hover:bg-[#e6f7f7]/50 transition-all flex flex-col items-center justify-center gap-2 py-10 cursor-pointer group"
      >
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
          <Plus className="w-4.5 h-4.5 text-[#5c5378] group-hover:text-[#0d7377] transition-colors" />
        </div>
        <span className="text-sm font-medium text-[#5c5378] group-hover:text-[#0d7377] transition-colors">
          Nieuw lokaal
        </span>
      </button>
    )
  }

  return (
    <motion.div
      layout
      transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
      className="bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-hidden"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#0b1c30]">Nieuw lokaal</p>
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5c5378] hover:bg-[#eff4ff] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-[#464554] mb-1.5">Naam lokaal</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="bijv. Lokaal 204, Science Lab"
            className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:font-normal placeholder:text-[#8a91a5]"
            autoFocus
          />
        </label>

        <div>
          <span className="block text-xs font-medium text-[#464554] mb-1.5">
            Beschikbare middelen
          </span>

          <div
            className="min-h-[44px] rounded-xl bg-[#dce9ff] px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-[#2a14b4]/35"
            onClick={() => document.getElementById("create-classroom-asset-input")?.focus()}
          >
            {assets.map((asset) => (
              <span
                key={asset}
                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs font-semibold rounded-lg bg-[#2a14b4] text-white shadow-[0px_2px_6px_rgba(42,20,180,0.25)]"
              >
                {asset}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeAsset(asset)
                  }}
                  className="ml-0.5 p-0.5 rounded-md hover:bg-white/20 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              id="create-classroom-asset-input"
              type="text"
              value={customAsset}
              onChange={(e) => setCustomAsset(e.target.value)}
              onKeyDown={handleCustomAssetKeyDown}
              onFocus={() => setShowPresets(true)}
              onBlur={() => setTimeout(() => setShowPresets(false), 200)}
              placeholder={assets.length === 0 ? "Typ of kies middelen..." : ""}
              className="flex-1 min-w-[120px] bg-transparent text-sm font-medium text-[#0b1c30] outline-none placeholder:font-normal placeholder:text-[#8a91a5]"
            />
          </div>

          {showPresets && availablePresets.length > 0 && (
            <div className="mt-2 rounded-xl bg-[#f8f9ff] p-2 shadow-[0px_12px_24px_rgba(11,28,48,0.1)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8a91a5] px-2 pb-1.5">
                Suggesties
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availablePresets
                  .filter(
                    (p) =>
                      !customAsset.trim() ||
                      p.toLowerCase().includes(customAsset.toLowerCase())
                  )
                  .map((preset) => (
                    <button
                      key={preset}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        addAsset(preset)
                        setCustomAsset("")
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff] transition-all"
                    >
                      <Plus className="w-3 h-3 text-[#2a14b4]" />
                      {preset}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={handleCreate}
            disabled={isSubmitting || !name.trim()}
            className="gap-1.5 text-sm"
          >
            <Check className="w-4 h-4" />
            Lokaal aanmaken
          </Button>
          <Button
            variant="ghost"
            onClick={onToggle}
            disabled={isSubmitting}
            className="text-sm"
          >
            Annuleren
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Class Card ──────────────────────────────────────────────

interface ClassCardProps {
  cls: Class
  isEditing: boolean
  isDeleting: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onCancelDelete: () => void
  onSaved: () => void
}

function ClassCard({
  cls,
  isEditing,
  isDeleting,
  onEdit,
  onCancelEdit,
  onDelete,
  onCancelDelete,
  onSaved,
}: ClassCardProps) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"

  function handleDelete() {
    const formData = new FormData()
    formData.set("_action", "delete")
    formData.set("classId", cls.id!)
    fetcher.submit(formData, { method: "POST" })
    onCancelDelete()
  }

  return (
    <motion.div
      layout
      transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
      className="bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-hidden"
    >
      {/* ── View mode ── */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2a14b4] to-[#4338ca] flex items-center justify-center flex-shrink-0 shadow-[0px_4px_10px_rgba(42,20,180,0.25)]">
              <SubjectIcon subjectName={cls.subject} className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0b1c30] truncate">{cls.name}</p>
              <p className="text-xs text-[#464554]">{cls.subject} · {cls.level} · {cls.school_year}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onEdit}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                isEditing
                  ? "bg-[#2a14b4]/10 text-[#2a14b4]"
                  : "text-[#5c5378] hover:bg-[#eff4ff]"
              )}
            >
              {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            </button>
            <button
              onClick={isDeleting ? handleDelete : onDelete}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                isDeleting
                  ? "bg-red-50 text-red-600"
                  : "text-[#5c5378] hover:bg-[#eff4ff]"
              )}
            >
              {isDeleting ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            </button>
            {isDeleting && (
              <button
                onClick={onCancelDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5c5378] hover:bg-[#eff4ff] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {isDeleting && (
          <p className="text-xs text-red-600 font-medium mb-3">
            Klik op ✓ om deze klas te verwijderen
          </p>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 bg-[#eff4ff] rounded-lg px-2.5 py-1.5">
            <Users className="w-3.5 h-3.5 text-[#5c5378]" />
            <span className="text-xs font-semibold text-[#0b1c30]">{cls.size} leerlingen</span>
          </div>
          <DifficultyPill difficulty={cls.difficulty ?? null} />
        </div>

        {/* Optional fields */}
        <div className="space-y-1.5">
          {cls.attention_span_minutes != null && (
            <div className="flex items-center gap-1.5 text-xs text-[#464554]">
              <Clock className="w-3.5 h-3.5 text-[#5c5378]" />
              <span>{cls.attention_span_minutes} min aandachtsspanne</span>
            </div>
          )}
          {cls.support_challenge != null && (
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] font-semibold">
                {cls.support_challenge}
              </Badge>
            </div>
          )}
          {cls.class_notes && (
            <p className="text-xs text-[#464554] line-clamp-2 mt-1">{cls.class_notes}</p>
          )}
        </div>
      </div>

      {/* ── Edit mode ── */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.5, ease: SUBTLE_EASE },
              opacity: { duration: 0.28, ease: SOFT_EASE },
            }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#eff4ff]">
              <EditForm cls={cls} onSaved={onSaved} onCancel={onCancelEdit} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Difficulty Pill ─────────────────────────────────────────

function DifficultyPill({ difficulty }: { difficulty: ClassDifficulty | null }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-white border border-[#e6e8f3] rounded-lg px-2.5 py-1.5">
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          difficulty === "Groen"
            ? "bg-emerald-500"
            : difficulty === "Oranje"
            ? "bg-orange-400"
            : difficulty === "Rood"
            ? "bg-red-500"
            : "bg-[#a6abc0]"
        )}
      />
      <span className="text-xs font-semibold text-[#464554]">
        {difficulty ?? "Niet opgegeven"}
      </span>
    </div>
  )
}

interface FieldHintLabelProps {
  label: string
  hint: FieldHintContent
}

function FieldHintLabel({ label, hint }: FieldHintLabelProps) {
  return (
    <div className="mb-1.5">
      <div className="relative inline-flex items-center gap-1.5 group/field-hint">
        <span className="block text-xs font-medium text-[#464554]">{label}</span>
        <span
          tabIndex={0}
          aria-label={`Uitleg over ${label}`}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#eff4ff] text-[#5c5378] transition-colors group-hover/field-hint:bg-[#dce9ff] group-focus-within/field-hint:bg-[#dce9ff]"
        >
          <CircleHelp className="w-3 h-3" />
        </span>

        <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-4rem)] rounded-xl border border-[#dbe4f8] bg-white/95 p-3 opacity-0 shadow-[0px_20px_32px_rgba(11,28,48,0.18)] translate-y-1 transition-all duration-200 group-hover/field-hint:opacity-100 group-hover/field-hint:translate-y-0 group-focus-within/field-hint:opacity-100 group-focus-within/field-hint:translate-y-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#5c5378]">
            AI-impact
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#464554]">
            {hint.impact}
          </p>
          <div className="mt-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#5c5378]">
              Mogelijke waarden
            </p>
            <ul className="mt-1 space-y-1">
              {hint.options.map((option) => (
                <li key={option} className="text-[11px] leading-relaxed text-[#464554]">
                  • {option}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Edit Form ───────────────────────────────────────────────

interface EditFormProps {
  cls: Class
  onSaved: () => void
  onCancel: () => void
}

function EditForm({ cls, onSaved, onCancel }: EditFormProps) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"

  const [name, setName] = useState(cls.name)
  const [level, setLevel] = useState<Level>(cls.level)
  const [schoolYear, setSchoolYear] = useState<SchoolYear>(cls.school_year)
  const [size, setSize] = useState<number>(cls.size)
  const [difficulty, setDifficulty] = useState<ClassDifficulty | null>(cls.difficulty ?? null)
  const [attentionSpan, setAttentionSpan] = useState<number | null>(cls.attention_span_minutes ?? null)
  const [supportChallenge, setSupportChallenge] = useState<ClassSupportChallenge | null>(cls.support_challenge ?? null)
  const [classNotes, setClassNotes] = useState<string>(cls.class_notes ?? "")
  const [showAiInfo, setShowAiInfo] = useState(false)

  const disabledYears = getDisabledYears(level)

  function handleSave() {
    const body: Record<string, unknown> = {
      name: name.trim(),
      level,
      school_year: schoolYear,
      size,
      difficulty: difficulty || null,
      attention_span_minutes: attentionSpan || null,
      support_challenge: supportChallenge || null,
      class_notes: classNotes.trim() || null,
    }

    const formData = new FormData()
    formData.set("_action", "update")
    formData.set("classId", cls.id!)
    formData.set("body", JSON.stringify(body))
    fetcher.submit(formData, { method: "POST" })
    onSaved()
  }

  return (
    <div className="p-5 space-y-4">
      {/* Name */}
      <label className="block">
        <span className="block text-xs font-medium text-[#464554] mb-1.5">Klasnaam</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="bijv. 3H1, 2V-A, Klas 4"
          className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:font-normal placeholder:text-[#8a91a5]"
        />
      </label>

      {/* Level & Year */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <FieldHintLabel
            label="Niveau"
            hint={FIELD_HINTS.level}
          />
          <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
            <SelectTrigger className="h-10 rounded-xl border border-transparent bg-[#dce9ff] px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className="rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
              position="popper"
            >
              {LEVELS.map((l) => (
                <SelectItem
                  key={l}
                  value={l}
                  className="rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#0b1c30] focus:bg-[#dce9ff] focus:text-[#0b1c30]"
                >
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="block">
          <FieldHintLabel
            label="Schooljaar"
            hint={FIELD_HINTS.schoolYear}
          />
          <Select value={schoolYear} onValueChange={(v) => setSchoolYear(v as SchoolYear)}>
            <SelectTrigger className="h-10 rounded-xl border border-transparent bg-[#dce9ff] px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className="rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
              position="popper"
            >
              {SCHOOL_YEARS.map((y) => (
                <SelectItem
                  key={y}
                  value={y}
                  disabled={disabledYears.includes(y)}
                  className="rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#0b1c30] focus:bg-[#dce9ff] focus:text-[#0b1c30] data-[disabled]:text-[#8a91a5]"
                >
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      {/* Class size & Attention span */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <FieldHintLabel
            label="Aantal leerlingen"
            hint={FIELD_HINTS.size}
          />
          <input
            type="number"
            min={1}
            max={99}
            value={size}
            onChange={(e) => setSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35"
          />
        </label>

        <label className="block">
          <FieldHintLabel
            label="Aandachtsspanne (min)"
            hint={FIELD_HINTS.attentionSpan}
          />
          <input
            type="number"
            min={1}
            max={120}
            value={attentionSpan ?? ""}
            onChange={(e) =>
              setAttentionSpan(e.target.value === "" ? null : Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            placeholder="bijv. 15"
            className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:font-normal placeholder:text-[#8a91a5]"
          />
        </label>
      </div>

      {/* Difficulty */}
      <div>
        <FieldHintLabel
          label="Klasdynamiek"
          hint={FIELD_HINTS.difficulty}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DIFFICULTY_OPTIONS.map(({ value, description }) => (
            <button
              key={value}
              onClick={() => setDifficulty(value)}
              className={cn(
                "rounded-xl px-3 py-2.5 text-left transition-all border",
                difficulty === value
                  ? value === "Groen"
                    ? "border-emerald-500 bg-emerald-50 shadow-[0px_6px_16px_rgba(16,185,129,0.2)]"
                    : value === "Oranje"
                    ? "border-orange-400 bg-[#fff1d8] shadow-[0px_6px_16px_rgba(251,146,60,0.2)]"
                    : "border-red-500 bg-red-50 shadow-[0px_6px_16px_rgba(239,68,68,0.2)]"
                  : "border-[#e6e8f3] bg-[#f8f9ff] hover:bg-[#eff4ff]"
              )}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    value === "Groen" ? "bg-emerald-500" : value === "Oranje" ? "bg-orange-400" : "bg-red-500"
                  )}
                />
                <span className="text-xs font-semibold text-[#0b1c30]">{value}</span>
              </span>
              <p className="text-[11px] text-[#464554] mt-0.5">{description}</p>
            </button>
          ))}
        </div>
      </div>
      {/* Class notes */}
      <label className="block">
        <FieldHintLabel
          label="Klasnotities"
          hint={FIELD_HINTS.classNotes}
        />
        <textarea
          rows={3}
          value={classNotes}
          onChange={(e) => setClassNotes(e.target.value)}
          placeholder="Bijv. de klas is energiek maar gemotiveerd, veel verschil in niveau..."
          className="w-full rounded-xl bg-[#dce9ff] px-3 py-2.5 text-sm text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:text-[#8a91a5] resize-none"
        />
      </label>

      {/* AI Impact Explainer */}
      <div>
        <button
          onClick={() => setShowAiInfo(!showAiInfo)}
          className="flex items-center gap-2 text-xs font-medium text-[#2a14b4] hover:text-[#4338ca] transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Hoe beïnvloedt dit je lessen?</span>
          {showAiInfo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <AnimatePresence>
          {showAiInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: SOFT_EASE }}
              className="overflow-hidden"
            >
              <div className="mt-2 bg-[#eff4ff] rounded-xl p-4 space-y-2.5">
                {AI_IMPACT_ITEMS.map(({ field, description }) => (
                  <div key={field}>
                    <span className="text-xs font-semibold text-[#0b1c30]">{field}</span>
                    <p className="text-[11px] text-[#464554] leading-relaxed">{description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={handleSave}
          disabled={isSubmitting}
          className="gap-1.5 text-sm"
        >
          <Check className="w-4 h-4" />
          Opslaan
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-sm"
        >
          Annuleren
        </Button>
      </div>
    </div>
  )
}

// ── Classroom Card ──────────────────────────────────────────

interface ClassroomCardProps {
  classroom: Classroom
  isEditing: boolean
  isDeleting: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onCancelDelete: () => void
  onSaved: () => void
}

function ClassroomCard({
  classroom,
  isEditing,
  isDeleting,
  onEdit,
  onCancelEdit,
  onDelete,
  onCancelDelete,
  onSaved,
}: ClassroomCardProps) {
  const fetcher = useFetcher()

  function handleDelete() {
    const formData = new FormData()
    formData.set("_action", "deleteClassroom")
    formData.set("classroomId", classroom.id!)
    fetcher.submit(formData, { method: "POST" })
    onCancelDelete()
  }

  return (
    <motion.div
      layout
      transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
      className="bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-hidden"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0d7377] to-[#14919b] flex items-center justify-center flex-shrink-0 shadow-[0px_4px_10px_rgba(13,115,119,0.25)]">
              <MapPin className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0b1c30] truncate">{classroom.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onEdit}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                isEditing
                  ? "bg-[#0d7377]/10 text-[#0d7377]"
                  : "text-[#5c5378] hover:bg-[#eff4ff]"
              )}
            >
              {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            </button>
            <button
              onClick={isDeleting ? handleDelete : onDelete}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                isDeleting
                  ? "bg-red-50 text-red-600"
                  : "text-[#5c5378] hover:bg-[#eff4ff]"
              )}
            >
              {isDeleting ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            </button>
            {isDeleting && (
              <button
                onClick={onCancelDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5c5378] hover:bg-[#eff4ff] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {isDeleting && (
          <p className="text-xs text-red-600 font-medium mb-3">
            Klik op ✓ om dit lokaal te verwijderen
          </p>
        )}

        {/* Assets */}
        {(classroom.assets ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(classroom.assets ?? []).map((asset) => (
              <span
                key={asset}
                className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#e6f7f7] text-[#0d7377]"
              >
                {asset}
              </span>
            ))}
          </div>
        )}

        {(classroom.assets ?? []).length === 0 && !isEditing && (
          <p className="text-xs text-[#8a91a5]">Geen middelen opgegeven</p>
        )}
      </div>

      {/* Edit mode */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.5, ease: SUBTLE_EASE },
              opacity: { duration: 0.28, ease: SOFT_EASE },
            }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#eff4ff]">
              <ClassroomEditForm
                classroom={classroom}
                onSaved={onSaved}
                onCancel={onCancelEdit}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Classroom Edit Form ─────────────────────────────────────

interface ClassroomEditFormProps {
  classroom: Classroom
  onSaved: () => void
  onCancel: () => void
}

function ClassroomEditForm({ classroom, onSaved, onCancel }: ClassroomEditFormProps) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"

  const [name, setName] = useState(classroom.name)
  const [assets, setAssets] = useState<string[]>(classroom.assets ?? [])
  const [customAsset, setCustomAsset] = useState("")
  const [showPresets, setShowPresets] = useState(false)

  const availablePresets = PRESET_ASSETS.filter((p) => !assets.includes(p))

  function addAsset(asset: string) {
    const trimmed = asset.trim()
    if (trimmed && !assets.includes(trimmed)) {
      setAssets((prev) => [...prev, trimmed])
    }
  }

  function removeAsset(asset: string) {
    setAssets((prev) => prev.filter((a) => a !== asset))
  }

  function handleCustomAssetKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      if (customAsset.trim()) {
        addAsset(customAsset)
        setCustomAsset("")
      }
    }
    if (e.key === "Backspace" && customAsset === "" && assets.length > 0) {
      setAssets((prev) => prev.slice(0, -1))
    }
  }

  function handleSave() {
    if (!name.trim()) return

    const body = {
      name: name.trim(),
      assets,
    }

    const formData = new FormData()
    formData.set("_action", "updateClassroom")
    formData.set("classroomId", classroom.id!)
    formData.set("body", JSON.stringify(body))
    fetcher.submit(formData, { method: "POST" })
    onSaved()
  }

  return (
    <div className="p-5 space-y-4">
      <label className="block">
        <span className="block text-xs font-medium text-[#464554] mb-1.5">Naam lokaal</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="bijv. Lokaal 204, Science Lab"
          className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:font-normal placeholder:text-[#8a91a5]"
        />
      </label>

      <div>
        <span className="block text-xs font-medium text-[#464554] mb-1.5">
          Beschikbare middelen
        </span>

        <div
          className="min-h-[44px] rounded-xl bg-[#dce9ff] px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-[#2a14b4]/35"
          onClick={() => document.getElementById(`asset-input-${classroom.id}`)?.focus()}
        >
          {assets.map((asset) => (
            <span
              key={asset}
              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs font-semibold rounded-lg bg-[#2a14b4] text-white shadow-[0px_2px_6px_rgba(42,20,180,0.25)]"
            >
              {asset}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeAsset(asset)
                }}
                className="ml-0.5 p-0.5 rounded-md hover:bg-white/20 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            id={`asset-input-${classroom.id}`}
            type="text"
            value={customAsset}
            onChange={(e) => setCustomAsset(e.target.value)}
            onKeyDown={handleCustomAssetKeyDown}
            onFocus={() => setShowPresets(true)}
            onBlur={() => setTimeout(() => setShowPresets(false), 200)}
            placeholder={assets.length === 0 ? "Typ of kies middelen..." : ""}
            className="flex-1 min-w-[120px] bg-transparent text-sm font-medium text-[#0b1c30] outline-none placeholder:font-normal placeholder:text-[#8a91a5]"
          />
        </div>

        {showPresets && availablePresets.length > 0 && (
          <div className="mt-2 rounded-xl bg-[#f8f9ff] p-2 shadow-[0px_12px_24px_rgba(11,28,48,0.1)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8a91a5] px-2 pb-1.5">
              Suggesties
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availablePresets
                .filter(
                  (p) =>
                    !customAsset.trim() ||
                    p.toLowerCase().includes(customAsset.toLowerCase())
                )
                .map((preset) => (
                  <button
                    key={preset}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      addAsset(preset)
                      setCustomAsset("")
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff] transition-all"
                  >
                    <Plus className="w-3 h-3 text-[#2a14b4]" />
                    {preset}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={handleSave}
          disabled={isSubmitting || !name.trim()}
          className="gap-1.5 text-sm"
        >
          <Check className="w-4 h-4" />
          Opslaan
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-sm"
        >
          Annuleren
        </Button>
      </div>
    </div>
  )
}
