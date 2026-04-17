import { useEffect, useState } from "react"
import { useFetcher } from "react-router"
import {
  Users,
  Pencil,
  Trash2,
  X,
  Check,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Loader2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Class, FileRecord } from "~/lib/backend/types"
import { Button } from "~/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  LEVELS,
  SCHOOL_YEARS,
  getDisabledYears,
  type Level,
  type SchoolYear,
  type ClassDifficulty,
} from "~/components/new-plan/types"
import { cn } from "~/lib/utils"
import {
  DIFFICULTY_OPTIONS,
  AI_IMPACT_ITEMS,
  FIELD_HINTS,
  SOFT_EASE,
  SUBTLE_EASE,
  SUBTLE_LAYOUT_TRANSITION,
  type FieldHintContent,
} from "../../routes/app.classes/constants"
import { ClassDocumentPicker } from "./ClassDocumentPicker"

// ── Class Card ──────────────────────────────────────────────

interface ClassCardProps {
  cls: Class
  availableLevels: Level[]
  isEditing: boolean
  isDeleting: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onCancelDelete: () => void
  onSaved: () => void
}

export function ClassCard({
  cls,
  availableLevels,
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
  const isDeleteSubmitting = fetcher.state !== "idle" && fetcher.formData?.get("_action") === "delete"

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
      className={cn(
        "bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-hidden relative",
        isDeleteSubmitting && "pointer-events-none"
      )}
    >
      {isDeleteSubmitting && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-2xl">
          <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
        </div>
      )}
      {/* View mode */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0b1c30] truncate">{cls.name}</p>
              <p className="text-xs text-[#464554]">{cls.level} · {cls.school_year}</p>
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
          {cls.class_notes && (
            <p className="text-xs text-[#464554] line-clamp-2 mt-1">{cls.class_notes}</p>
          )}
        </div>
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
              <EditForm cls={cls} availableLevels={availableLevels} onSaved={onSaved} onCancel={onCancelEdit} />
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

// ── Field Hint Label ────────────────────────────────────────

function FieldHintLabel({ label, hint }: { label: string; hint: FieldHintContent }) {
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

function EditForm({ cls, availableLevels, onSaved, onCancel }: { cls: Class; availableLevels: Level[]; onSaved: () => void; onCancel: () => void }) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"

  const [name, setName] = useState(cls.name)
  const [level, setLevel] = useState<Level>(cls.level)
  const [schoolYear, setSchoolYear] = useState<SchoolYear>(cls.school_year)
  const [size, setSize] = useState<number>(cls.size)
  const [difficulty, setDifficulty] = useState<ClassDifficulty | null>(cls.difficulty ?? null)
  const [attentionSpan, setAttentionSpan] = useState<number | null>(cls.attention_span_minutes ?? null)
  const [classNotes, setClassNotes] = useState<string>(cls.class_notes ?? "")
  const [showAiInfo, setShowAiInfo] = useState(false)
  const [linkedFiles, setLinkedFiles] = useState<FileRecord[]>([])

  const disabledYears = getDisabledYears(level)

  // Load files linked to this class
  useEffect(() => {
    if (!cls.id) return
    fetch(`/api/class-files/${cls.id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((files: FileRecord[]) => setLinkedFiles(files))
      .catch(() => setLinkedFiles([]))
  }, [cls.id])

  function handleSave() {
    const body: Record<string, unknown> = {
      name: name.trim(),
      level,
      school_year: schoolYear,
      size,
      difficulty: difficulty || null,
      attention_span_minutes: attentionSpan || null,
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
              {(availableLevels.length > 0 ? availableLevels : LEVELS).map((l) => (
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
            label="Leerjaar"
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

      {/* Class documents */}
      <ClassDocumentPicker
        classId={cls.id!}
        linkedFiles={linkedFiles}
        onLinkedFilesChange={setLinkedFiles}
      />

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
